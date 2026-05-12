from rest_framework import viewsets, permissions, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Count
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from .models import User, Student, TeachingStaff, NonTeachingStaff, StudentVital, TeachingStaffVital, NonTeachingStaffVital, PatientArchive
from .serializers import UserSerializer, PatientSerializer, VitalSignRecordSerializer

def get_patient_model(category):
    if category == 'STUDENT': return Student
    if category == 'TEACHING_STAFF': return TeachingStaff
    if category == 'NON_TEACHING_STAFF': return NonTeachingStaff
    return Student # default fallback

class IsNurse(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.NURSE

class IsDoctorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [User.Role.DOCTOR, User.Role.ADMIN]

class SystemLogView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        action_name = request.data.get('action')
        details = request.data.get('details', '')
        if not action_name:
            return Response({'error': 'action is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import ActionLog
            ActionLog.objects.create(
                user=request.user,
                action=action_name,
                entity_type='System',
                entity_id='N/A',
                details=details
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f'ActionLog tracking failed (non-critical): {e}')
        return Response({'success': True})

class PatientViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsDoctorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request):
        search_query = request.query_params.get('search', None)
        patients = []
        for Model in [Student, TeachingStaff, NonTeachingStaff, PatientArchive]:
            qs = Model.objects.all()
            if search_query:
                from django.db.models import Q, Value
                from django.db.models.functions import Concat
                qs = qs.annotate(
                    full_name_standard=Concat('first_name', Value(' '), 'last_name'),
                    full_name_formal=Concat('last_name', Value(', '), 'first_name', Value(' '), 'middle_initial', Value('., '), 'suffix')
                ).filter(
                    Q(first_name__icontains=search_query) |
                    Q(last_name__icontains=search_query) |
                    Q(patient_id__icontains=search_query) |
                    Q(full_name_standard__icontains=search_query) |
                    Q(full_name_formal__icontains=search_query) |
                    Q(suffix__icontains=search_query)
                )
            patients.extend(qs)
        
        serializer = PatientSerializer(patients, many=True)
        return Response(serializer.data)

    def create(self, request):
        data = request.data
        inst_id = data.get('patient_id')
        category = data.get('category', 'STUDENT')
        Model = get_patient_model(category)

        # Check if already exists in any table
        for M in [Student, TeachingStaff, NonTeachingStaff, PatientArchive]:
            if M.objects.filter(patient_id=inst_id).exists():
                return Response({'error': 'Patient ID already exists'}, status=status.HTTP_400_BAD_REQUEST)

        fields = {
            'first_name': data.get('first_name', ''),
            'last_name': data.get('last_name', ''),
            'middle_initial': data.get('middle_initial', ''),
            'suffix': data.get('suffix'),
            'birth_date': data.get('birth_date') or None,
            'sex': data.get('sex') or None,
            'civil_status': data.get('civil_status') or None,
            'status': data.get('status', 'ACTIVE')
        }
        if category == 'STUDENT':
            fields['course'] = data.get('course')
            fields['year_level'] = data.get('year_level')
            
        patient = Model(**fields)
        patient.last_modified_by = request.user if request.user.is_authenticated else None
        patient.save()
        
        # Inject default baseline vital record so the patient immediately appears in Dashboard 'New Encounters'
        if category == 'STUDENT': VitalModel = StudentVital
        elif category == 'TEACHING_STAFF': VitalModel = TeachingStaffVital
        elif category == 'NON_TEACHING_STAFF': VitalModel = NonTeachingStaffVital
        else: VitalModel = StudentVital
        
        VitalModel.objects.create(
            patient=patient,
            heart_rate=0,
            blood_pressure_systolic=0,
            blood_pressure_diastolic=0,
            oxygen_saturation=0,
            body_temperature=0,
            recorded_by=request.user if request.user.is_authenticated else None,
            is_alert=False,
            is_acknowledged=True
        )

        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        data = request.data

        # ── Status toggle: ARCHIVE / RETRIEVE ─────────────────────────
        if 'status' in data and len(data) == 1:
            new_status = data['status']

            if new_status == 'INACTIVE':
                # Move patient from active table → PatientArchive
                for Model in [Student, TeachingStaff, NonTeachingStaff]:
                    patient = Model.objects.filter(patient_id=pk).first()
                    if patient:
                        PatientArchive.objects.update_or_create(
                            patient_id=pk,
                            defaults={
                                'original_id': patient.pk,
                                'first_name': patient.first_name,
                                'last_name': patient.last_name,
                                'middle_initial': patient.middle_initial or '',
                                'suffix': patient.suffix or '',
                                'birth_date': getattr(patient, 'birth_date', None),
                                'sex': getattr(patient, 'sex', None),
                                'civil_status': getattr(patient, 'civil_status', None),
                                'clinical_notes': getattr(patient, 'clinical_notes', None),
                                'course': getattr(patient, 'course', None) or '',
                                'year_level': getattr(patient, 'year_level', None) or '',
                                'category': patient.category,
                            }
                        )
                        patient.delete()
                        return Response({'status': 'INACTIVE'})
                return Response({'error': 'Not found'}, status=404)

            elif new_status == 'ACTIVE':
                # Move patient from PatientArchive → active table
                archived = PatientArchive.objects.filter(patient_id=pk).first()
                if not archived:
                    return Response({'error': 'Not found in archive'}, status=404)
                category = archived.category
                Model = get_patient_model(category)
                fields = {
                    'patient_id': pk,
                    'first_name': archived.first_name,
                    'last_name': archived.last_name,
                    'middle_initial': archived.middle_initial,
                    'suffix': archived.suffix,
                    'birth_date': archived.birth_date,
                    'sex': archived.sex,
                    'civil_status': archived.civil_status,
                    'clinical_notes': archived.clinical_notes,
                    'status': 'ACTIVE',
                }
                if category == 'STUDENT':
                    fields['course'] = archived.course
                    fields['year_level'] = archived.year_level

                # Restore with the original integer PK so the patient keeps the same DB id
                if archived.original_id and not Model.objects.filter(pk=archived.original_id).exists():
                    patient = Model(**fields)
                    patient.pk = archived.original_id
                    patient.save(force_insert=True)
                else:
                    # Fallback: let the DB assign a new pk (original_id missing or already taken)
                    Model.objects.update_or_create(patient_id=pk, defaults={k: v for k, v in fields.items() if k != 'patient_id'})

                archived.delete()
                return Response({'status': 'ACTIVE'})

        # ── Regular field update ───────────────────────────────────────
        patient = None
        for Model in [Student, TeachingStaff, NonTeachingStaff, PatientArchive]:
            patient = Model.objects.filter(patient_id=pk).first()
            if patient:
                break

        if not patient:
            return Response({'error': 'Not found'}, status=404)

        serializer = PatientSerializer(patient, data=data, partial=True)
        if serializer.is_valid():
            patient.last_modified_by = request.user if request.user.is_authenticated else None
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def destroy(self, request, pk=None):
        # Delete from active tables AND archive
        for Model in [Student, TeachingStaff, NonTeachingStaff, PatientArchive]:
            patient = Model.objects.filter(patient_id=pk).first()
            if patient:
                # Cascade-delete vitals (DO_NOTHING constraint requires manual delete)
                for VitalModel in [StudentVital, TeachingStaffVital, NonTeachingStaffVital]:
                    VitalModel.objects.filter(patient_id=pk).delete()
                patient.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def log_action(self, request, pk=None):
        action_name = request.data.get('action')
        details = request.data.get('details', '')
        if not action_name:
            return Response({'error': 'action is required'}, status=status.HTTP_400_BAD_REQUEST)

        patient = None
        for Model in [Student, TeachingStaff, NonTeachingStaff, PatientArchive]:
            patient = Model.objects.filter(patient_id=pk).first()
            if patient:
                break
        
        if not patient:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            from .models import ActionLog
            ActionLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action=action_name,
                entity_type=patient.__class__.__name__,
                entity_id=patient.patient_id,
                details=details
            )
        except Exception:
            pass
        return Response({'success': True})



class VitalSignViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VitalSignRecordSerializer

    def get_vital_models(self):
        return [StudentVital, TeachingStaffVital, NonTeachingStaffVital]

    def list(self, request):
        patient_id = request.query_params.get('patient_id', None)
        category = request.query_params.get('category', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        vitals = []
        
        models_to_query = self.get_vital_models()
        if category == 'STUDENT': models_to_query = [StudentVital]
        elif category == 'TEACHING_STAFF': models_to_query = [TeachingStaffVital]
        elif category == 'NON_TEACHING_STAFF': models_to_query = [NonTeachingStaffVital]

        for Model in models_to_query:
            qs = Model.objects.all()
            if patient_id is not None:
                qs = qs.filter(patient_id=patient_id)
            if start_date:
                qs = qs.filter(recorded_at__gte=start_date)
            if end_date:
                from datetime import datetime, timedelta
                try:
                    # Add one day to include the end date entirely
                    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date() + timedelta(days=1)
                    qs = qs.filter(recorded_at__lt=end_date_obj)
                except ValueError:
                    pass
            vitals.extend(qs)
        
        vitals.sort(key=lambda x: x.recorded_at, reverse=True)
        serializer = self.serializer_class(vitals, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        inst_id = data.get('patient_id')
        category = data.get('category', 'STUDENT')
        PatientModel = get_patient_model(category)
        
        if category == 'STUDENT': VitalModel = StudentVital
        elif category == 'TEACHING_STAFF': VitalModel = TeachingStaffVital
        elif category == 'NON_TEACHING_STAFF': VitalModel = NonTeachingStaffVital
        else: VitalModel = StudentVital

        if not inst_id:
            return Response({'error': 'patient_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        if data.get('is_register'):
            for M in [Student, TeachingStaff, NonTeachingStaff, PatientArchive]:
                if M.objects.filter(patient_id=inst_id).exists():
                    return Response({'error': 'Patient ID already exists'}, status=status.HTTP_400_BAD_REQUEST)

        defaults = {
            'first_name': data.get('first_name', ''),
            'last_name': data.get('last_name', ''),
            'middle_initial': data.get('middle_initial', ''),
            'suffix': data.get('suffix') or None,
            'birth_date': data.get('birth_date') or None,
            'sex': data.get('sex') or None,
            'civil_status': data.get('civil_status') or None,
            'status': data.get('status', 'ACTIVE')
        }
        if category == 'STUDENT':
            defaults['course'] = data.get('course') or None
            defaults['year_level'] = data.get('year_level') or None

        patient, created = PatientModel.objects.get_or_create(
            patient_id=inst_id,
            defaults=defaults
        )
        
        user = request.user if request.user.is_authenticated else None
        
        vital = VitalModel.objects.create(
            patient=patient,
            heart_rate=data.get('heart_rate'),
            blood_pressure_systolic=data.get('blood_pressure_systolic'),
            blood_pressure_diastolic=data.get('blood_pressure_diastolic'),
            oxygen_saturation=data.get('oxygen_saturation'),
            body_temperature=data.get('body_temperature'),
            recorded_by=user
        )

        if not created:
            update_fields = []
            allowed_fields = ['birth_date', 'sex', 'suffix', 'status']
            if category == 'STUDENT':
                allowed_fields.extend(['course', 'year_level'])
                
            for field in allowed_fields:
                if data.get(field) is not None:
                    setattr(patient, field, data.get(field))
                    update_fields.append(field)
            if update_fields:
                patient.save(update_fields=update_fields)
        
        response_data = self.serializer_class(vital).data
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        vitals = []
        for Model in self.get_vital_models():
            vitals.extend(Model.objects.order_by('-recorded_at')[:50])
            
        vitals.sort(key=lambda x: x.recorded_at, reverse=True)
        
        recent_vitals = []
        seen = set()
        for v in vitals:
            key = (v.__class__.__name__, v.patient_id)
            if key not in seen:
                seen.add(key)
                recent_vitals.append(v)
                if len(recent_vitals) == 10:
                    break

        serializer = self.serializer_class(recent_vitals, many=True)
        return Response(serializer.data)

class DashboardSummaryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get(self, request):
        today = timezone.now().date()
        today_vitals_count = 0
        alert_count = 0
        total_hr = 0
        total_temp = 0
        
        for Model in [StudentVital, TeachingStaffVital, NonTeachingStaffVital]:
            qs = Model.objects.filter(recorded_at__date=today)
            c = qs.count()
            today_vitals_count += c
            alert_count += qs.filter(is_alert=True).count()
            
            if c > 0:
                total_hr += (qs.aggregate(Avg('heart_rate'))['heart_rate__avg'] or 0) * c
                total_temp += (qs.aggregate(Avg('body_temperature'))['body_temperature__avg'] or 0) * c

        avg_hr = total_hr / today_vitals_count if today_vitals_count > 0 else 0
        avg_temp = total_temp / today_vitals_count if today_vitals_count > 0 else 0
        
        summary = {
            "today_vitals_count": today_vitals_count,
            "alert_count": alert_count,
            "avg_heart_rate": avg_hr,
            "avg_temp": avg_temp,
            "category_breakdown": [
                {'category': 'STUDENT', 'count': Student.objects.count()},
                {'category': 'TEACHING_STAFF', 'count': TeachingStaff.objects.count()},
                {'category': 'NON_TEACHING_STAFF', 'count': NonTeachingStaff.objects.count()},
            ]
        }
        return Response(summary)

class AlarmHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get_models(self, category):
        if category == 'STUDENT': return [StudentVital]
        if category == 'TEACHING_STAFF': return [TeachingStaffVital]
        if category == 'NON_TEACHING_STAFF': return [NonTeachingStaffVital]
        return [StudentVital, TeachingStaffVital, NonTeachingStaffVital]

    def get(self, request):
        category = request.query_params.get('category')
        days = request.query_params.get('days')
        start_date = timezone.now() - timedelta(days=int(days)) if days else None
        
        vitals = []
        for Model in self.get_models(category):
            qs = Model.objects.filter(is_alert=True)
            if start_date:
                qs = qs.filter(recorded_at__gte=start_date)
            vitals.extend(qs)
            
        vitals.sort(key=lambda x: x.recorded_at, reverse=True)
        serializer = VitalSignRecordSerializer(vitals, many=True)
        return Response(serializer.data)

    def patch(self, request):
        alert_id = request.data.get('id')
        if alert_id:
            for Model in [StudentVital, TeachingStaffVital, NonTeachingStaffVital]:
                try:
                    record = Model.objects.get(id=alert_id, is_alert=True)
                    record.is_acknowledged = True
                    record.save()
                    return Response({'success': True})
                except Model.DoesNotExist:
                    continue
            return Response({'error': 'Record not found'}, status=404)
        
        for Model in [StudentVital, TeachingStaffVital, NonTeachingStaffVital]:
            Model.objects.filter(is_alert=True, is_acknowledged=False).update(is_acknowledged=True)
        return Response({'success': True})

    def delete(self, request):
        alert_id = request.data.get('id')
        for Model in [StudentVital, TeachingStaffVital, NonTeachingStaffVital]:
            updated = Model.objects.filter(id=alert_id, is_alert=True).update(is_alert=False)
            if updated > 0:
                return Response({'success': True})
        return Response({'error': 'Record not found'}, status=404)

class ClinicStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrAdmin]

    def get(self, request):
        last_30_days = timezone.now() - timedelta(days=30)
        
        # We need to manually aggregate by day across 3 tables since union+annotate is finicky in Django ORM
        from collections import defaultdict
        daily_counts = defaultdict(int)
        
        for Model in [StudentVital, TeachingStaffVital, NonTeachingStaffVital]:
            qs = Model.objects.filter(recorded_at__gte=last_30_days)
            for v in qs:
                day_str = v.recorded_at.date().isoformat()
                daily_counts[day_str] += 1
                
        stats = [{'day': k, 'count': v} for k, v in sorted(daily_counts.items())]
            
        category_stats = [
            {'category': 'STUDENT', 'count': StudentVital.objects.count()},
            {'category': 'TEACHING_STAFF', 'count': TeachingStaffVital.objects.count()},
            {'category': 'NON_TEACHING_STAFF', 'count': NonTeachingStaffVital.objects.count()},
        ]
        
        return Response({
            "daily_usage": stats,
            "category_stats": category_stats
        })

class VerifyPasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response({"error": "Password not provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.check_password(password):
            return Response({"success": True})
        return Response({"error": "Invalid password"}, status=status.HTTP_401_UNAUTHORIZED)

class UpdateProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        data = request.data

        if 'username' in data and data['username']:
            if User.objects.exclude(pk=user.pk).filter(username=data['username']).exists():
                return Response({'error': 'Username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)
            user.username = data['username']
            
        if 'name' in data:
            name_parts = data['name'].split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
            else:
                user.last_name = ''
            
        if 'email' in data:
            user.email = data['email']
            
        if 'old_password' in data and 'new_password' in data:
            if not user.check_password(data['old_password']):
                return Response({'error': 'Invalid active security key.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(data['new_password'])

        user.save()
        return Response(UserSerializer(user).data)
