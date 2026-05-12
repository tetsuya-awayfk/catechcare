
import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { Search, User, FileText, ArrowRight, X, Save, Activity, Thermometer, Droplets, CheckCircle2, Loader2, Download, Plus, AlertCircle, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { useAlarms } from '../AlarmContext';
import { useLocation } from 'react-router-dom';
import MedicalCertificateModal from '../components/MedicalCertificateModal';
import { useHardware } from '../HardwareContext';

interface PatientsProps {
  user: { role: UserRole };
}

const Patients: React.FC<PatientsProps> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Password Security states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordAction, setPasswordAction] = useState<'ARCHIVE_TOGGLE' | 'VIEW_ARCHIVED_TOGGLE' | 'DELETE_PATIENT' | 'MULTI_DELETE' | 'MULTI_RETRIEVE' | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [certPatient, setCertPatient] = useState<any | null>(null);

  const initialOpenProcessed = useRef(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  // We use selectedForDeletion to also mean selected for retrieve now on the archive view


  // New states for Register/Vital Modals matching Dashboard
  const [showVitalCheckModal, setShowVitalCheckModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState<'REGISTER' | 'VITAL_CHECK' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Editable Profile States
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMI, setEditMI] = useState('');
  const [editSuffix, setEditSuffix] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editBirth, setEditBirth] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editYearLevel, setEditYearLevel] = useState('');
  const [editInstId, setEditInstId] = useState('');
  const [editClinicalNotes, setEditClinicalNotes] = useState('');
  const [formCategory, setFormCategory] = useState<string>('STUDENT');
  const [formBirthDate, setFormBirthDate] = useState<string>('');
  const [formInstId, setFormInstId] = useState<string>('');
  const [formInstIdPlaceholder, setFormInstIdPlaceholder] = useState<string>('e.g. S123456');
  const [formSuffix, setFormSuffix] = useState<string>('');
  const [formCourse, setFormCourse] = useState<string>('');
  const [formYearLevel, setFormYearLevel] = useState<string>('');
  const [formCivilStatus, setFormCivilStatus] = useState<string>('');
  const [formHr, setFormHr] = useState('');
  const [formBp, setFormBp] = useState('');
  const [formSpo2, setFormSpo2] = useState('');
  const [formTemp, setFormTemp] = useState('');
  const [editCivilStatus, setEditCivilStatus] = useState('');

  const location = useLocation();
  const { refreshAlarms } = useAlarms();
  const { isConnected, hardwareData, sendCommand, error: serialError } = useHardware();
  const [gatheringStep, setGatheringStep] = useState<'IDLE' | 'SPO2' | 'TEMP' | 'DONE'>('IDLE');
  const prevHardwareTimestamp = useRef<number>(0);
  const [liveSpo2, setLiveSpo2] = useState('');
  const [liveTemp, setLiveTemp] = useState('');

  const handleGetSpo2 = async () => {
    setGatheringStep('SPO2');
    setLiveSpo2('');
    prevHardwareTimestamp.current = hardwareData?.timestamp || 0;
    await sendCommand('GET_SPO2');
  };

  const handleGetTemp = async () => {
    setGatheringStep('TEMP');
    setLiveTemp('');
    prevHardwareTimestamp.current = hardwareData?.timestamp || 0;
    // Small delay to let ESP32 fully finish SpO2 processing before requesting temp
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendCommand('GET_TEMP');
  };

  useEffect(() => {
    if (!hardwareData || hardwareData.timestamp <= prevHardwareTimestamp.current) return;
    prevHardwareTimestamp.current = hardwareData.timestamp;

    if (hardwareData.error) {
      if (gatheringStep === 'SPO2') setLiveSpo2('Error');
      if (gatheringStep === 'TEMP') setLiveTemp('Error');
      setTimeout(() => setGatheringStep('IDLE'), 2000);
      return;
    }

    if (gatheringStep === 'SPO2') {
      if (hardwareData.spo2) {
        setLiveSpo2(hardwareData.spo2);
        setFormSpo2(hardwareData.spo2);
        setGatheringStep('IDLE');
      } else if (hardwareData.live_spo2) {
        setLiveSpo2(hardwareData.live_spo2);
      }
    } else if (gatheringStep === 'TEMP') {
      if (hardwareData.temp) {
        setLiveTemp(hardwareData.temp);
        setFormTemp(hardwareData.temp);
        setGatheringStep('DONE');
      } else if (hardwareData.live_temp) {
        setLiveTemp(hardwareData.live_temp);
      }
    }
  }, [hardwareData, gatheringStep]);

  // Sync HR to hardware LCD
  useEffect(() => {
    if (isConnected && formHr) { sendCommand(`SET_HR:${formHr}`); }
  }, [formHr, isConnected]);

  // Sync BP to hardware LCD
  useEffect(() => {
    if (isConnected && formBp) { sendCommand(`SET_BP:${formBp}`); }
  }, [formBp, isConnected]);

  const resetHardwareState = () => {
    setGatheringStep('IDLE');
    setLiveSpo2('');
    setLiveTemp('');
  };

  useEffect(() => {
    fetchPatients();
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, showArchived]);

  useEffect(() => {
    if (location.state?.openPatientId && patients.length > 0 && !initialOpenProcessed.current) {
      const matching = patients.find(p => p.id === location.state.openPatientId);
      if (matching) {
        handleSelectPatient(matching);
        initialOpenProcessed.current = true;
        // Clear state so it doesn't auto-reopen if closed
        window.history.replaceState({}, '');
      }
    }
  }, [location.state, patients]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const data = await api.searchPatients(searchTerm);
      const mapped = data.map((p: any) => ({
        pk: p.id,
        id: p.patient_id,
        rawFirstName: p.first_name,
        firstName: p.name_formatted || `${p.last_name}, ${p.first_name} ${p.middle_initial ? p.middle_initial + '.' : ''} ${p.suffix && p.suffix !== '-' ? ', ' + p.suffix : ''}`.trim(),
        last_name: p.last_name,
        middleInitial: p.middle_initial,
        category: p.category,
        vitals: p.latest_vitals ? {
          hr: p.latest_vitals.heart_rate,
          bp: `${p.latest_vitals.blood_pressure_systolic}/${p.latest_vitals.blood_pressure_diastolic}`,
          spo2: p.latest_vitals.oxygen_saturation,
          temp: p.latest_vitals.body_temperature
        } : { hr: '--', bp: '--/--', spo2: '--', temp: '--' },
        lastUpdate: p.latest_vitals ? new Date(p.latest_vitals.recorded_at).toLocaleDateString() : 'No record',
        age: computeAge(p.birth_date),
        birth_date: p.birth_date,
        sex: p.sex || 'Unknown',
        civil_status: p.civil_status || '',
        suffix: p.suffix || '-',
        course: p.course || '',
        year_level: p.year_level || '',
        status: p.status || 'ACTIVE',
        clinical_notes: p.clinical_notes || '',
        room: p.course && p.year_level ? `${p.course} - ${p.year_level}` : '--'
      }));
      setPatients(mapped);
    } catch (error) {
      console.error("Failed to fetch patients", error);
    } finally {
      setIsLoading(false);
    }
  };

  const computeAge = (birthDate: string | null) => {
    if (!birthDate) return '--';
    const bd = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
      age--;
    }
    return age;
  };

  const handleEditBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length > 4) val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    else if (val.length > 2) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    setEditBirth(val);
  };

  const handleFormBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length > 4) val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    else if (val.length > 2) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    setFormBirthDate(val);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };



  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build exactly the fields allowed for update using backend snake_case keys
      const updatePayload = {
        first_name: editFirstName,
        last_name: editLastName,
        middle_initial: editMI,
        suffix: editSuffix,
        category: editCategory,
        sex: editSex,
        civil_status: editCivilStatus || null,
        birth_date: editBirth ? (editBirth.includes('/') ? `${editBirth.split('/')[2]}-${editBirth.split('/')[0].padStart(2, '0')}-${editBirth.split('/')[1].padStart(2, '0')}` : editBirth) : null,
        course: editCategory === 'STUDENT' ? editCourse : '',
        year_level: editCategory === 'STUDENT' ? editYearLevel : '',
        patient_id: editInstId,
        clinical_notes: editClinicalNotes
      };
      await api.updatePatient(selectedPatient.id, updatePayload);
      
      triggerToast('Profile successfully updated.');
      setIsEditing(false);
      
      // Close modal gracefully, forcing a background Native Refresh from Postgres to guarantee 100% sync
      setSelectedPatient(null);
      fetchPatients(); 
    } catch (error) {
      console.error("Failed to update patient", error);
      triggerToast("Error updating patient profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeferredAction = async () => {
    if (passwordAction === 'ARCHIVE_TOGGLE') {
      await toggleStatus();
    } else if (passwordAction === 'VIEW_ARCHIVED_TOGGLE') {
      setShowArchived(!showArchived);
    } else if (passwordAction === 'DELETE_PATIENT') {
      await deletePatient();
    } else if (passwordAction === 'MULTI_DELETE') {
      await bulkDeletePatients();
    } else if (passwordAction === 'MULTI_RETRIEVE') {
      await bulkRetrievePatients();
    }
    setPasswordAction(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPassword(true);
    setPasswordError(null);
    try {
      await api.verifyPassword(passwordInput);
      setShowPasswordModal(false);
      setPasswordInput('');
      await executeDeferredAction();
    } catch (error) {
      setPasswordError("Incorrect password. Please try again.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const requestArchiveToggle = () => {
    setPasswordAction('ARCHIVE_TOGGLE');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const requestViewArchivedToggle = () => {
    if (showArchived) {
       // Instantly hide without checking password!
       setShowArchived(false);
       setSelectedForDeletion([]);
    } else {
       // Must authenticate to view!
       setPasswordAction('VIEW_ARCHIVED_TOGGLE');
       setPasswordError(null);
       setShowPasswordModal(true);
    }
  };

  const toggleStatus = async () => {
    try {
      if (!selectedPatient) return;
      const newStatus = selectedPatient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updatePatient(selectedPatient.id, { status: newStatus });
      triggerToast(newStatus === 'ACTIVE' ? 'Patient successfully retrieved.' : 'Patient successfully archived.');
      fetchPatients();
      
      // Auto-collapse the profile modal instantly regardless of path!
      setSelectedPatient(null);
    } catch (error) {
       console.error("Failed to update status", error);
       triggerToast("Error updating patient status.");
    }
  };

  const requestDeletePatient = () => {
    setPasswordAction('DELETE_PATIENT');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const requestMultiDelete = () => {
    if (selectedForDeletion.length === 0) return;
    setPasswordAction('MULTI_DELETE');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const requestMultiRetrieve = () => {
    if (selectedForDeletion.length === 0) return;
    setPasswordAction('MULTI_RETRIEVE');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const bulkDeletePatients = async () => {
    try {
      if (selectedForDeletion.length === 0) return;
      await Promise.all(selectedForDeletion.map(id => api.deletePatient(id)));
      triggerToast(`${selectedForDeletion.length} records permanently deleted.`);
      setSelectedForDeletion([]);
      fetchPatients();
    } catch (error) {
       console.error("Failed to delete patients", error);
       triggerToast("Error deleting patient records.");
    }
  };

  const bulkRetrievePatients = async () => {
    try {
      if (selectedForDeletion.length === 0) return;
      await Promise.all(selectedForDeletion.map(id => api.updatePatient(id, { status: 'ACTIVE' })));
      triggerToast(`${selectedForDeletion.length} records retrieved from archives.`);
      setSelectedForDeletion([]);
      fetchPatients();
    } catch (error) {
       console.error("Failed to retrieve patients", error);
       triggerToast("Error retrieving patient records.");
    }
  };

  const deletePatient = async () => {
    try {
      if (!selectedPatient) return;
      await api.deletePatient(selectedPatient.id);
      triggerToast('Patient record permanently deleted.');
      fetchPatients();
      setSelectedPatient(null);
    } catch (error) {
       console.error("Failed to delete patient", error);
       triggerToast("Error deleting patient record.");
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegisterError(null);
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      is_register: true,
      patient_id: formData.get('institutional_id') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('surname') as string,
      middle_initial: formData.get('mi') as string,
      suffix: formSuffix,
      category: formCategory,
      birth_date: formBirthDate.includes('/') ? `${formBirthDate.split('/')[2]}-${formBirthDate.split('/')[0].padStart(2, '0')}-${formBirthDate.split('/')[1].padStart(2, '0')}` : formBirthDate,
      sex: formData.get('sex') as string,
      civil_status: formCivilStatus || null,
      course: formCategory === 'STUDENT' ? formCourse : '',
      year_level: formCategory === 'STUDENT' ? formYearLevel : '',
      heart_rate: parseInt(formData.get('hr') as string),
      blood_pressure_systolic: parseInt((formData.get('bp') as string).split('/')[0]),
      blood_pressure_diastolic: parseInt((formData.get('bp') as string).split('/')[1]),
      oxygen_saturation: parseFloat(formData.get('spo2') as string),
      body_temperature: parseFloat(formData.get('temp') as string),
    };

    try {
      await api.addVitals(data);
      if (isConnected) {
        sendCommand('RESET_LCD');
      }
      setShowRegisterModal(false);
      triggerToast('Record Synchronized Successfully');
      fetchPatients();
      refreshAlarms(); // Immediately update notification bell
    } catch (error: any) {
      console.error("Failed", error);
      setRegisterError(error.message || "Failed to register patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewVitalCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsSubmitting(true);
    
    const data = {
      patient_id: selectedPatient.id,
      category: selectedPatient.category,
      first_name: selectedPatient.rawFirstName || selectedPatient.firstName || '',
      last_name: selectedPatient.last_name || '',
      middle_initial: selectedPatient.middleInitial || '',
      suffix: selectedPatient.suffix && selectedPatient.suffix !== '-' ? selectedPatient.suffix : null,
      birth_date: selectedPatient.birth_date || null,
      sex: selectedPatient.sex || null,
      course: selectedPatient.course || '',
      year_level: selectedPatient.year_level || '',
      heart_rate: parseInt(formHr),
      blood_pressure_systolic: parseInt(formBp.split('/')[0]),
      blood_pressure_diastolic: parseInt(formBp.split('/')[1]),
      oxygen_saturation: parseFloat(formSpo2),
      body_temperature: parseFloat(formTemp),
    };

    try {
      await api.addVitals(data);
      if (isConnected) {
        sendCommand('RESET_LCD');
      }
      setShowVitalCheckModal(false);
      triggerToast('Record Synchronized Successfully');
      refreshAlarms(); // Immediately update notification bell
      
      setSelectedPatient({
        ...selectedPatient,
        vitals: {
          hr: data.heart_rate,
          bp: `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic}`,
          spo2: data.oxygen_saturation,
          temp: data.body_temperature
        },
        lastUpdate: new Date().toLocaleDateString()
      });
      
      fetchPatients();
    } catch (error: any) {
      console.error("Failed", error);
      triggerToast("Failed to add vital signs");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setFormCategory(newCat);
    if (newCat !== 'STUDENT') {
      setFormCourse('');
      setFormYearLevel('');
    }
    let prefix = newCat === 'TEACHING_STAFF' ? 'F' : newCat === 'NON_TEACHING_STAFF' ? 'A' : 'S';
    setFormInstIdPlaceholder(`e.g. ${prefix}123456`);
  };

  const handleCloseRegisterModal = () => {
    setShowConfirmCancelModal('REGISTER');
  };

  const handleCloseVitalCheckModal = () => {
    setShowConfirmCancelModal('VITAL_CHECK');
  };

  const confirmCancel = () => {
    if (showConfirmCancelModal === 'REGISTER') {
      setShowRegisterModal(false);
    } else if (showConfirmCancelModal === 'VITAL_CHECK') {
      setShowVitalCheckModal(false);
    }
    setShowConfirmCancelModal(null);
  };

  const openRegisterModal = () => {
    setRegisterError(null);
    setFormCategory('STUDENT');
    setFormBirthDate('');
    setFormInstId('');
    setFormSuffix('');
    setFormCourse('');
    setFormYearLevel('');
    setFormCivilStatus('');
    setFormHr('');
    setFormBp('');
    setFormSpo2('');
    setFormTemp('');
    resetHardwareState();
    setFormInstIdPlaceholder(`e.g. S123456`);
    setShowRegisterModal(true);
  };

  const openVitalCheckModal = () => {
    setFormHr('');
    setFormBp('');
    setFormSpo2('');
    setFormTemp('');
    resetHardwareState();
    setShowVitalCheckModal(true);
  };

  const computedAge = React.useMemo(() => computeAge(formBirthDate), [formBirthDate]);

  const isNurse = user.role === UserRole.NURSE;

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setEditInstId(patient.id || '');
    setEditFirstName(patient.rawFirstName || patient.first_name || '');
    setEditLastName(patient.last_name || '');
    setEditMI(patient.middleInitial || '');
    setEditSuffix(patient.suffix && patient.suffix !== '-' ? patient.suffix : '');
    setEditCategory(patient.category || 'STUDENT');
    setEditSex(patient.sex || '');
    setEditCivilStatus(patient.civil_status || '');
    if (patient.birth_date && patient.birth_date.includes('-')) {
      const parts = patient.birth_date.split('-');
      setEditBirth(`${parts[1]}/${parts[2].split('T')[0]}/${parts[0]}`);
    } else {
      setEditBirth(patient.birth_date || '');
    }
    setEditCourse(patient.course || '');
    setEditYearLevel(patient.year_level || '');
    setEditInstId(patient.id || '');
    setEditClinicalNotes(patient.clinical_notes || '');
    setIsEditing(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#022FFC] dark:text-[#022FFC] tracking-tighter uppercase text-xs mb-1">Patient Records</h1>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">Institutional Health Logs</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#022FFC] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-gray-700 dark:text-zinc-200"
            />
          </div>
          <div className="relative group w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 pl-4 pr-10 text-xs font-black uppercase tracking-widest text-[#022FFC] dark:text-zinc-200 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer w-full shadow-sm"
            >
              <option value="ALL">All Categories</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHING_STAFF">Teaching Staff</option>
              <option value="NON_TEACHING_STAFF">Non-Teaching Staff</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
          <button 
            onClick={openRegisterModal}
            className="px-6 py-3 bg-[#022FFC] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-blue-500/20 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} /> Register Patient
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-zinc-800/30 border-b border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest">
                {showArchived && (
                  <th className="py-5 px-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded-sm border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-blue-500 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allArchivedIds = patients.filter(p => p.status === 'INACTIVE').map(p => p.id);
                          setSelectedForDeletion(allArchivedIds);
                        } else {
                          setSelectedForDeletion([]);
                        }
                      }}
                      checked={selectedForDeletion.length > 0 && selectedForDeletion.length === patients.filter(p => p.status === 'INACTIVE').length}
                    />
                  </th>
                )}
                <th className="py-5 px-8">ID & Full Name</th>
                <th className="py-5 px-6">Institutional Role</th>
                <th className="py-5 px-6">Latest Check</th>
                <th className="py-5 px-6">Status</th>
                <th className="py-5 px-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-6 px-8 flex items-center gap-4">
                      <div className="h-12 w-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-100 dark:bg-zinc-800 rounded" />
                        <div className="h-3 w-20 bg-gray-100 dark:bg-zinc-800 rounded" />
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="h-4 w-24 bg-gray-100 dark:bg-zinc-800 rounded" />
                    </td>
                    <td className="py-6 px-6">
                      <div className="h-4 w-12 bg-gray-100 dark:bg-zinc-800 rounded" />
                    </td>
                    <td className="py-6 px-6">
                      <div className="h-6 w-16 bg-gray-100 dark:bg-zinc-800 rounded-full" />
                    </td>
                    <td className="py-6 px-8">
                      <div className="h-8 w-8 bg-gray-100 dark:bg-zinc-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : (() => {
                const filteredPatients = patients
                  .filter(p => showArchived ? p.status === 'INACTIVE' : (p.status === 'ACTIVE' && (selectedCategory === 'ALL' || p.category === selectedCategory)))
                  .sort((a, b) => {
                    const catWeight = { 'STUDENT': 1, 'TEACHING_STAFF': 2, 'NON_TEACHING_STAFF': 3 };
                    const weightA = catWeight[a.category as keyof typeof catWeight] || 4;
                    const weightB = catWeight[b.category as keyof typeof catWeight] || 4;
                    if (weightA !== weightB) return weightA - weightB;
                    return (a.last_name || '').localeCompare(b.last_name || '');
                  });
                const paginatedPatients = filteredPatients.slice((currentPage - 1) * 10, currentPage * 10);
                
                return paginatedPatients.map((patient: any) => (
                  <tr 
                    key={patient.id} 
                    className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    {showArchived && (
                      <td className="py-5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded-sm border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-blue-500 cursor-pointer"
                          checked={selectedForDeletion.includes(patient.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForDeletion([...selectedForDeletion, patient.id]);
                            } else {
                              setSelectedForDeletion(selectedForDeletion.filter(id => id !== patient.id));
                            }
                          }}
                        />
                      </td>
                    )}
                    <td onClick={() => handleSelectPatient(patient)} className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-[#022FFC] group-hover:bg-[#022FFC] group-hover:text-white transition-all">
                          <User size={24} />
                        </div>
                        <div>
                          <p className="font-bold dark:text-white leading-tight">
                            {patient.firstName}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">ID: {patient.id}</p>
                        </div>
                      </div>
                    </td>
                    <td onClick={() => handleSelectPatient(patient)} className="py-5 px-6">
                      <span className="text-[10px] font-black dark:text-zinc-300 uppercase tracking-widest">{patient.category.replace(/_/g, ' ')}</span>
                    </td>
                    <td onClick={() => handleSelectPatient(patient)} className="py-5 px-6">
                      <div className="text-xs">
                        {(() => {
                           const sys = patient.vitals.bp !== '--/--' ? parseInt(patient.vitals.bp.split('/')[0]) : null;
                           const dia = patient.vitals.bp !== '--/--' ? parseInt(patient.vitals.bp.split('/')[1]) : null;
                           const hr = patient.vitals.hr !== '--' ? parseInt(patient.vitals.hr) : null;
                           const spo2 = patient.vitals.spo2 !== '--' ? parseFloat(patient.vitals.spo2) : null;
                           const temp = patient.vitals.temp !== '--' ? parseFloat(patient.vitals.temp) : null;
                           
                           let status = 'Normal';
                           if (patient.vitals.bp === '--/--') {
                             status = 'No Data';
                           } else if (sys > 120 || dia > 80 || hr < 60 || hr > 100 || spo2 < 95 || temp < 36.5 || temp >= 38) {
                             status = 'Need Checking';
                           }
                           
                           return (
                             <p className={`font-black uppercase tracking-widest ${status === 'Normal' ? 'text-emerald-500' : status === 'Need Checking' ? 'text-rose-500' : 'text-gray-400'}`}>
                               {status}
                             </p>
                           );
                        })()}
                        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{patient.lastUpdate}</p>
                      </div>
                    </td>
                    <td onClick={() => setSelectedPatient(patient)} className="py-5 px-6">
                      {patient.status === 'ACTIVE' ? (
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/20">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 uppercase tracking-widest border border-red-100 dark:border-red-800/20">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCertPatient(patient); }}
                          className="p-2.5 text-gray-400 hover:text-[#022FFC] hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all active:scale-90"
                          title="Download Medical Certificate"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => setSelectedPatient(patient)}
                          className="p-2.5 text-gray-400 hover:text-[#022FFC] hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all active:scale-90"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      {(() => {
        const filteredPatients = patients.filter(p => showArchived ? p.status === 'INACTIVE' : (p.status === 'ACTIVE' && (selectedCategory === 'ALL' || p.category === selectedCategory)));
        const totalPages = Math.ceil(filteredPatients.length / 10);
        
        if (totalPages <= 1) return null;
        
        const btnClass = "px-4 py-2 text-xs font-black uppercase tracking-widest bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 dark:text-zinc-400";

        return (
          <div className="flex items-center justify-center gap-2 mt-4">
            {/* << First Page */}
            <button 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={btnClass}
              title="First Page"
            >
              &laquo;
            </button>
            {/* Previous */}
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={btnClass}
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-colors ${currentPage === i + 1 ? 'bg-[#022FFC] text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {/* Next */}
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={btnClass}
            >
              Next
            </button>
            {/* >> Last Page */}
            <button 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={btnClass}
              title="Last Page"
            >
              &raquo;
            </button>
          </div>
        );
      })()}

      <div className="flex justify-between items-center mt-4">
        <div className="flex gap-2">
          {showArchived && selectedForDeletion.length > 0 && (
            <>
              <button 
                onClick={requestMultiDelete}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                Delete Selected ({selectedForDeletion.length})
              </button>
              <button 
                onClick={requestMultiRetrieve}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                Retrieve Selected ({selectedForDeletion.length})
              </button>
            </>
          )}
        </div>
        <button 
          onClick={requestViewArchivedToggle}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-colors transition-all active:scale-95"
        >
          {showArchived ? 'Hide Archived Records' : 'View Archived Records'}
        </button>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => !isSaving && setSelectedPatient(null)}
          />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col border border-gray-100 dark:border-zinc-800">
            <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/30 dark:bg-zinc-800/20">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 md:h-20 md:w-20 bg-blue-50 dark:bg-blue-900/30 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-[#022FFC] dark:text-teal-400 font-black text-2xl md:text-3xl border border-blue-100 dark:border-blue-800">
                  {selectedPatient.last_name?.[0] || 'U'}{selectedPatient.firstName?.[0] || 'N'}
                </div>
                <div>
                  {isEditing ? (
                    <div className="space-y-3">
                         <div className="flex gap-2">
                            <input value={editLastName} onChange={e => setEditLastName(e.target.value)} className="w-[140px] bg-gray-100 dark:bg-zinc-800 border-none rounded-xl py-2 px-3 text-sm text-[#022FFC] dark:text-teal-400 font-bold outline-none placeholder:text-blue-300 dark:placeholder:text-zinc-500" placeholder="Last Name" />
                            <input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="w-[140px] bg-gray-100 dark:bg-zinc-800 border-none rounded-xl py-2 px-3 text-sm text-[#022FFC] dark:text-teal-400 font-bold outline-none placeholder:text-blue-300 dark:placeholder:text-zinc-500" placeholder="First Name" />
                            <input value={editMI} onChange={e => setEditMI(e.target.value)} maxLength={1} className="w-[60px] bg-gray-100 dark:bg-zinc-800 border-none rounded-xl py-2 px-3 text-sm text-[#022FFC] dark:text-teal-400 font-bold outline-none placeholder:text-blue-300 dark:placeholder:text-zinc-500 text-center" placeholder="M.I." />
                            <select value={editSuffix} onChange={e => setEditSuffix(e.target.value)} className="w-[70px] bg-gray-100 dark:bg-zinc-800 border-none rounded-xl py-2 px-2 text-xs text-[#022FFC] dark:text-teal-400 font-bold outline-none cursor-pointer appearance-none text-center">
                              <option value="">-</option>
                              <option value="Jr.">Jr.</option>
                              <option value="Sr.">Sr.</option>
                              <option value="II">II</option>
                              <option value="III">III</option>
                              <option value="IV">IV</option>
                            </select>
                         </div>
                         <input value={editInstId} onChange={(e) => {
                           const val = e.target.value.toUpperCase();
                           setEditInstId(val);
                           if (val.startsWith('S')) setEditCategory('STUDENT');
                           else if (val.startsWith('F')) setEditCategory('TEACHING_STAFF');
                           else if (val.startsWith('A')) setEditCategory('NON_TEACHING_STAFF');
                         }} className="w-[180px] bg-gray-100 dark:bg-zinc-800 border-none rounded-xl py-2 px-3 text-xs font-mono uppercase text-[#022FFC] dark:text-zinc-400 font-black outline-none placeholder:text-blue-200 dark:placeholder:text-zinc-600" placeholder="Patient ID" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-black dark:text-white tracking-tighter">
                          {selectedPatient.firstName}
                        </h2>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Patient ID: {selectedPatient.id} • {selectedPatient.category.replace(/_/g, ' ')}</p>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: 'Heart Rate', value: selectedPatient.vitals.hr, unit: 'BPM', icon: <Activity className="text-rose-500" /> },
                   { label: 'Blood Pressure', value: selectedPatient.vitals.bp, unit: 'mmHg', icon: <Activity className="text-blue-500" /> },
                   { label: 'Oxygen', value: selectedPatient.vitals.spo2, unit: '%', icon: <Droplets className="text-cyan-500" /> },
                   { label: 'Temp', value: selectedPatient.vitals.temp, unit: '°C', icon: <Thermometer className="text-amber-500" /> },
                 ].map((v, i) => (
                   <div key={i} className="bg-gray-50 dark:bg-zinc-800/50 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">{v.label}</span>
                        {v.icon}
                     </div>
                     <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-black dark:text-white tabular-nums">{v.value}</span>
                       <span className="text-[9px] font-black text-gray-400">{v.unit}</span>
                     </div>
                   </div>
                 ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black dark:text-zinc-500 text-gray-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                      <FileText size={16} className="text-[#022FFC]" /> Clinical Observation Notes
                    </h4>
                    {isEditing ? (
                      <textarea 
                        value={editClinicalNotes}
                        onChange={e => setEditClinicalNotes(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-blue-500/20 rounded-2xl p-4 text-sm font-bold focus:border-[#022FFC] outline-none transition-all h-40 dark:text-zinc-200"
                        placeholder="No clinical observation notes available."
                      />
                    ) : (
                      <div className="bg-white dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl text-sm font-medium text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {selectedPatient.clinical_notes || "No clinical observation notes available."}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#022FFC] dark:bg-zinc-800 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/10">
                    <h4 className="text-[10px] font-black text-blue-200 dark:text-zinc-500 mb-4 uppercase tracking-[0.2em]">Profile Data</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {/* Age */}
                      <span className="text-blue-100/60 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest self-center">Age</span>
                      <span className="font-black text-xs text-right">{computeAge(isEditing ? editBirth : selectedPatient.birth_date)} Yrs</span>

                      {/* Sex */}
                      <span className="text-blue-100/60 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest self-center">Sex</span>
                      {isEditing ? (
                        <select value={editSex} onChange={e => setEditSex(e.target.value)} className="bg-blue-900/50 dark:bg-zinc-900 border-none rounded-lg py-1 px-2 text-xs text-white font-bold outline-none cursor-pointer appearance-none text-right w-full">
                          <option value="">-Select-</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      ) : (
                        <span className="font-black text-xs text-right capitalize">{selectedPatient.sex?.toLowerCase() || 'unknown'}</span>
                      )}

                      {/* Civil Status */}
                      <span className="text-blue-100/60 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest self-center">Civil Status</span>
                      {isEditing ? (
                        <select value={editCivilStatus} onChange={e => setEditCivilStatus(e.target.value)} className="bg-blue-900/50 dark:bg-zinc-900 border-none rounded-lg py-1 px-2 text-xs text-white font-bold outline-none cursor-pointer appearance-none text-right w-full">
                          <option value="">-Select-</option>
                          <option value="SINGLE">Single</option>
                          <option value="MARRIED">Married</option>
                          <option value="WIDOWED">Widowed</option>
                        </select>
                      ) : (
                        <span className="font-black text-xs text-right capitalize">{selectedPatient.civil_status?.toLowerCase() || '--'}</span>
                      )}

                      {/* Birth Date */}
                      <span className="text-blue-100/60 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest self-center">Birth Date</span>
                      {isEditing ? (
                        <input type="text" pattern="(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/\d{4}" placeholder="MM/DD/YYYY" value={editBirth} onChange={handleEditBirthChange} className="bg-blue-900/50 dark:bg-zinc-900 border-none rounded-lg py-1 px-2 text-xs text-white font-bold outline-none text-right cursor-text w-full" />
                      ) : (
                        <span className="font-black text-xs text-right">{selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString() : '--'}</span>
                      )}

                      {/* Course & Year — students only */}
                      {selectedPatient.category === 'STUDENT' && (
                        <>
                          <span className="text-blue-100/60 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-widest self-center">Course & Year</span>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <select value={editCourse} onChange={e => setEditCourse(e.target.value)} className="flex-1 min-w-0 bg-blue-900/50 dark:bg-zinc-900 border-none rounded-lg py-1 px-1 text-[10px] text-white font-bold outline-none cursor-pointer appearance-none text-center">
                                <option value="">Course</option>
                                <optgroup label="Engineering">
                                  <option value="BSEE">BSEE</option>
                                  <option value="BSECE">BSECE</option>
                                  <option value="BSCpE">BSCpE</option>
                                  <option value="BET Auto.">BET Auto.</option>
                                  <option value="BET Elec.">BET Elec.</option>
                                </optgroup>
                                <optgroup label="Information Technology">
                                  <option value="BSIT">BSIT</option>
                                  <option value="BSCS">BSCS</option>
                                  <option value="ACT">ACT</option>
                                </optgroup>
                                <optgroup label="Business Administration">
                                  <option value="BSFM">BSFM</option>
                                  <option value="BSMM">BSMM</option>
                                </optgroup>
                              </select>
                              <select value={editYearLevel} onChange={e => setEditYearLevel(e.target.value)} className="w-10 bg-blue-900/50 dark:bg-zinc-900 border-none rounded-lg py-1 px-1 text-[10px] text-white font-bold outline-none cursor-pointer appearance-none text-center">
                                <option value="">Yr</option>
                                <option value="1">1st</option>
                                <option value="2">2nd</option>
                                <option value="3">3rd</option>
                                <option value="4">4th</option>
                                <option value="5">5th</option>
                              </select>
                            </div>
                          ) : (
                            <span className="font-black text-xs text-right truncate">
                              {selectedPatient.course && selectedPatient.year_level
                                ? `${selectedPatient.course} - ${selectedPatient.year_level}${selectedPatient.year_level === '1' ? 'st' : selectedPatient.year_level === '2' ? 'nd' : selectedPatient.year_level === '3' ? 'rd' : 'th'}`
                                : '--'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50/50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center gap-4">
              <div className="flex gap-3 w-full">
                {isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-3 border border-gray-200 dark:border-zinc-700 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    {!isNurse && (
                       <button
                         onClick={(e) => { e.stopPropagation(); requestArchiveToggle(); }}
                         className="px-6 py-3 border border-rose-200 dark:border-rose-900/50 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all active:scale-95 flex items-center justify-center whitespace-nowrap"
                       >
                         {selectedPatient.status === 'ACTIVE' ? 'Archive Patient' : 'Reactivate Record'}
                       </button>
                    )}
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="ml-auto px-8 py-3 bg-[#022FFC] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Commit Updates
                    </button>
                  </>
                ) : selectedPatient.status === 'INACTIVE' ? (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); requestDeletePatient(); }}
                      className="px-8 py-3 bg-rose-900 border border-rose-500 text-rose-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-800 transition-all active:scale-95 shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 hidden"
                    >
                      Delete Record
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); requestArchiveToggle(); }}
                      className="ml-auto px-8 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 hidden"
                    >
                      Retrieve Record
                    </button>
                    <div className="text-gray-400 dark:text-zinc-500 text-xs font-black uppercase tracking-widest w-full text-center">
                       Archived Record - Read Only
                    </div>
                  </>
                ) : (
                  <>
                    <button 
                      disabled={isNurse}
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all text-[#022FFC] active:scale-95 disabled:opacity-50"
                    >
                      {isNurse ? 'Read Only Access' : 'Enable Clinical Edit'}
                    </button>
                    <button 
                      onClick={openVitalCheckModal}
                      className="ml-auto px-8 py-3 bg-[#022FFC] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={18} /> New Vital Check
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-8 right-8 z-[110] animate-in slide-in-from-right-10 duration-500">
           <div className="bg-[#022FFC] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-blue-400">
              <CheckCircle2 size={24} className="text-white" />
              <div className="text-left">
                <p className="font-black text-xs uppercase tracking-widest">System Record Sync</p>
                <p className="text-[10px] opacity-70 font-medium">{toastMessage}</p>
              </div>
           </div>
        </div>
      )}
      {showVitalCheckModal && selectedPatient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isSubmitting && handleCloseVitalCheckModal()} />
          <div className="bg-white dark:bg-[#09090b] rounded-[2.5rem] shadow-2xl p-8 md:p-10 w-full max-w-xl relative z-10 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black dark:text-white tracking-tighter flex items-center gap-2">
                <Activity size={24} className="text-[#022FFC]" />
                New Vital Check
              </h3>
              <button onClick={handleCloseVitalCheckModal} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>
            
            {/* LCD Display */}
            <div className="mb-6 bg-[#1a2332] rounded-2xl p-5 border border-[#2a3a4f] shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">20×4 LCD Display</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
              <div className="bg-[#0a1628] rounded-xl p-4 font-mono text-sm leading-relaxed border border-[#1a2a3f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                <p className="text-[#4ade80]"><span className="text-zinc-500">HR:</span>   {formHr ? `${formHr} bpm` : '-- bpm'}</p>
                <p className="text-[#4ade80]"><span className="text-zinc-500">BP:</span>   {formBp ? `${formBp} mm Hg` : '--/-- mm Hg'}</p>
                <p className={gatheringStep === 'SPO2' ? 'text-[#facc15] animate-pulse' : 'text-[#4ade80]'}><span className="text-zinc-500">SpO2:</span> {formSpo2 ? `${formSpo2}%` : gatheringStep === 'SPO2' && liveSpo2 ? `${liveSpo2}%` : '--%'}</p>
                <p className={gatheringStep === 'TEMP' ? 'text-[#facc15] animate-pulse' : 'text-[#4ade80]'}><span className="text-zinc-500">TEMP:</span> {formTemp ? `${formTemp}°C` : gatheringStep === 'TEMP' && liveTemp ? `${liveTemp}°C` : '--°C'}</p>
              </div>
            </div>
            {/* Sensor Acquisition Controls */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#022FFC] dark:text-teal-400">Sensor Acquisition</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">Acquire SpO2 & Temp sequentially from connected station</p>
                  {serialError && <p className="text-xs text-rose-500 font-bold mt-1">{serialError}</p>}
                  {!isConnected && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">⚠️ Connect station first</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleGetSpo2} disabled={!isConnected || gatheringStep === 'SPO2'} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${formSpo2 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 cursor-pointer' : gatheringStep === 'SPO2' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse' : isConnected ? 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20' : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'}`}>
                  {gatheringStep === 'SPO2' ? (<><Loader2 size={12} className="animate-spin" /> {liveSpo2 ? `${liveSpo2}%` : 'Reading...'}</>) : formSpo2 ? (<><CheckCircle2 size={12} /> {formSpo2}%</>) : (<><Droplets size={12} /> Get SpO2</>)}
                </button>
                <button type="button" onClick={handleGetTemp} disabled={!isConnected || !formSpo2 || gatheringStep === 'TEMP'} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${formTemp ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 cursor-pointer' : gatheringStep === 'TEMP' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse' : isConnected && formSpo2 ? 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20' : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'}`}>
                  {gatheringStep === 'TEMP' ? (<><Loader2 size={12} className="animate-spin" /> {liveTemp ? `${liveTemp}°C` : 'Reading...'}</>) : formTemp ? (<><CheckCircle2 size={12} /> {formTemp}°C</>) : (<><Thermometer size={12} /> Get Temp</>)}
                </button>
              </div>
            </div>

            <form onSubmit={handleNewVitalCheckSubmit} className="space-y-5">
              <input type="hidden" name="institutional_id" value={selectedPatient.id} />
              <input type="hidden" name="first_name" value={selectedPatient.firstName} />
              <input type="hidden" name="surname" value={selectedPatient.last_name} />
              <input type="hidden" name="category" value={selectedPatient.category} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Heart Rate (BPM)</label>
                  <input name="hr" required type="number" min="0" max="300" value={formHr} onChange={(e) => setFormHr(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Blood Pressure (SYS/DIA)</label>
                  <input name="bp" required type="text" value={formBp} onChange={(e) => setFormBp(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="--/--" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">Oxygen Saturation (%) {gatheringStep === 'SPO2' && <Loader2 size={10} className="animate-spin text-[#022FFC]" />}</label>
                  <input name="spo2" required type="text" readOnly value={formSpo2} className={`w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none ${gatheringStep === 'SPO2' ? 'text-blue-500 animate-pulse' : ''}`} placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">Body Temperature (°C) {gatheringStep === 'TEMP' && <Loader2 size={10} className="animate-spin text-[#022FFC]" />}</label>
                  <input name="temp" required type="text" readOnly value={formTemp} className={`w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none ${gatheringStep === 'TEMP' ? 'text-blue-500 animate-pulse' : ''}`} placeholder="--" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting || !formHr || !formBp || !formSpo2 || !formTemp} className="w-full py-4 bg-[#022FFC] text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-2xl uppercase tracking-widest text-xs">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Submit Clinic Data
              </button>
            </form>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isSubmitting && handleCloseRegisterModal()} />
          <div className="bg-white dark:bg-[#09090b] rounded-[2.5rem] shadow-2xl p-8 md:p-10 w-full max-w-xl relative z-10 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black dark:text-white tracking-tighter flex items-center gap-2">
                <UserPlus size={24} className="text-[#022FFC]" />
                New Patient Registration
              </h3>
              <button onClick={handleCloseRegisterModal} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            {/* LCD Display */}
            <div className="mb-6 bg-[#1a2332] rounded-2xl p-5 border border-[#2a3a4f] shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">20×4 LCD Display</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
              <div className="bg-[#0a1628] rounded-xl p-4 font-mono text-sm leading-relaxed border border-[#1a2a3f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                <p className="text-[#4ade80]"><span className="text-zinc-500">HR:</span>   {formHr ? `${formHr} bpm` : '-- bpm'}</p>
                <p className="text-[#4ade80]"><span className="text-zinc-500">BP:</span>   {formBp ? `${formBp} mm Hg` : '--/-- mm Hg'}</p>
                <p className={gatheringStep === 'SPO2' ? 'text-[#facc15] animate-pulse' : 'text-[#4ade80]'}><span className="text-zinc-500">SpO2:</span> {formSpo2 ? `${formSpo2}%` : gatheringStep === 'SPO2' && liveSpo2 ? `${liveSpo2}%` : '--%'}</p>
                <p className={gatheringStep === 'TEMP' ? 'text-[#facc15] animate-pulse' : 'text-[#4ade80]'}><span className="text-zinc-500">TEMP:</span> {formTemp ? `${formTemp}°C` : gatheringStep === 'TEMP' && liveTemp ? `${liveTemp}°C` : '--°C'}</p>
              </div>
            </div>
            {/* Sensor Acquisition Controls */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#022FFC] dark:text-teal-400">Sensor Acquisition</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">Acquire SpO2 & Temp sequentially from connected station</p>
                  {serialError && <p className="text-xs text-rose-500 font-bold mt-1">{serialError}</p>}
                  {!isConnected && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">⚠️ Connect station first</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleGetSpo2} disabled={!isConnected || !!formSpo2 || gatheringStep === 'SPO2'} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${formSpo2 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-default' : gatheringStep === 'SPO2' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse' : isConnected ? 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20' : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'}`}>
                  {gatheringStep === 'SPO2' ? (<><Loader2 size={12} className="animate-spin" /> {liveSpo2 ? `${liveSpo2}%` : 'Reading...'}</>) : formSpo2 ? (<><CheckCircle2 size={12} /> {formSpo2}%</>) : (<><Droplets size={12} /> Get SpO2</>)}
                </button>
                <button type="button" onClick={handleGetTemp} disabled={!isConnected || !formSpo2 || !!formTemp || gatheringStep === 'TEMP'} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${formTemp ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-default' : gatheringStep === 'TEMP' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse' : isConnected && formSpo2 ? 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20' : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'}`}>
                  {gatheringStep === 'TEMP' ? (<><Loader2 size={12} className="animate-spin" /> {liveTemp ? `${liveTemp}°C` : 'Reading...'}</>) : formTemp ? (<><CheckCircle2 size={12} /> {formTemp}°C</>) : (<><Thermometer size={12} /> Get Temp</>)}
                </button>
              </div>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-5">
              {registerError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                  <X size={16} /> {registerError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Institutional ID</label>
                  <input name="institutional_id" required type="text" pattern="^[SFA]\d{6}$" maxLength={7} value={formInstId} onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormInstId(val);
                    if (val.startsWith('S')) setFormCategory('STUDENT');
                    else if (val.startsWith('F')) setFormCategory('TEACHING_STAFF');
                    else if (val.startsWith('A')) setFormCategory('NON_TEACHING_STAFF');
                  }} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none uppercase" placeholder={formInstIdPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                  <select name="category" required value={formCategory} onChange={handleCategoryChange} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none appearance-none cursor-pointer">
                    <option value="STUDENT">Student</option>
                    <option value="TEACHING_STAFF">Teaching Staff</option>
                    <option value="NON_TEACHING_STAFF">Non-Teaching Staff</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Last Name</label>
                  <input name="surname" required type="text" className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">First Name</label>
                  <input name="first_name" required type="text" className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">M.I.</label>
                  <input name="mi" type="text" maxLength={1} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-3 text-sm dark:text-white font-bold text-center outline-none uppercase" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Suffix</label>
                  <select value={formSuffix} onChange={e => setFormSuffix(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-2 text-xs dark:text-white font-bold text-center outline-none appearance-none cursor-pointer">
                    <option value="">-</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
                <div className={`space-y-1.5 ${formCategory !== 'STUDENT' ? 'opacity-50' : ''}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Course Program</label>
                  <select disabled={formCategory !== 'STUDENT'} required={formCategory === 'STUDENT'} value={formCourse} onChange={e => setFormCourse(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed text-ellipsis">
                    <option value="">Select Course...</option>
                    <optgroup label="Engineering">
                      <option value="BSEE">BSEE</option>
                      <option value="BSECE">BSECE</option>
                      <option value="BSCpE">BSCpE</option>
                      <option value="BET Auto.">BET Auto.</option>
                      <option value="BET Elec.">BET Elec.</option>
                    </optgroup>
                    <optgroup label="Information Technology">
                      <option value="BSIT">BSIT</option>
                      <option value="BSCS">BSCS</option>
                      <option value="ACT">ACT</option>
                    </optgroup>
                    <optgroup label="Business Administration">
                      <option value="BSFM">BSFM</option>
                      <option value="BSMM">BSMM</option>
                    </optgroup>
                  </select>
                </div>
                <div className={`space-y-1.5 ${formCategory !== 'STUDENT' ? 'opacity-50' : ''}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Year Level</label>
                  <select disabled={formCategory !== 'STUDENT'} required={formCategory === 'STUDENT'} value={formYearLevel} onChange={e => setFormYearLevel(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed">
                    <option value="">Select Year...</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Birth Date</label>
                  <input name="birth_date" required type="text" pattern="(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/\d{4}" value={formBirthDate} onChange={handleFormBirthDateChange} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="MM/DD/YYYY" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Age</label>
                  <input name="age" type="text" value={computedAge} readOnly className="w-full bg-gray-100 dark:bg-zinc-800/80 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none opacity-70 cursor-not-allowed" placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sex</label>
                  <select name="sex" required className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Select...</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Civil Status</label>
                  <select name="civil_status" value={formCivilStatus} onChange={e => setFormCivilStatus(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Select...</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Heart Rate (BPM)</label>
                  <input name="hr" required type="number" min="0" max="300" value={formHr} onChange={(e) => setFormHr(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Blood Pressure (SYS/DIA)</label>
                  <input name="bp" required type="text" value={formBp} onChange={(e) => setFormBp(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="--/--" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">Oxygen Saturation (%) {gatheringStep === 'SPO2' && <Loader2 size={10} className="animate-spin text-[#022FFC]" />}</label>
                  <input name="spo2" required type="text" readOnly value={formSpo2 || (gatheringStep === 'SPO2' ? liveSpo2 : '')} className={`w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none ${gatheringStep === 'SPO2' ? 'text-blue-500 animate-pulse' : ''}`} placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">Body Temperature (°C) {gatheringStep === 'TEMP' && <Loader2 size={10} className="animate-spin text-[#022FFC]" />}</label>
                  <input name="temp" required type="text" readOnly value={formTemp || (gatheringStep === 'TEMP' ? liveTemp : '')} className={`w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none ${gatheringStep === 'TEMP' ? 'text-blue-500 animate-pulse' : ''}`} placeholder="--" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting || !formHr || !formBp || !formSpo2 || !formTemp} className="w-full py-4 bg-[#022FFC] text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-2xl uppercase tracking-widest text-xs">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Confirm Vital Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md animate-in fade-in" onClick={() => !isVerifyingPassword && setShowPasswordModal(false)} />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 md:p-10 w-full max-w-sm relative z-10 animate-in zoom-in-95 border border-rose-100 dark:border-rose-900/30 overflow-hidden text-center">
            <div className="mx-auto h-20 w-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mb-6">
               <User size={32} />
            </div>
            <h3 className="text-xl font-black dark:text-white tracking-tighter mb-2">Security Verification</h3>
            <p className="text-xs text-gray-500 font-bold mb-8">Please enter your {user.role.toLowerCase()} password to authorize this action.</p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <p className="text-xs font-black text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 py-2 px-4 rounded-xl mb-4 border border-rose-100 dark:border-rose-900/30">
                  {passwordError}
                </p>
              )}
              <input 
                type="password" 
                required 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-4 px-5 text-sm dark:text-white font-black outline-none focus:ring-4 focus:ring-rose-500/10 text-center tracking-widest"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={isVerifyingPassword || !passwordInput} 
                className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20"
              >
                {isVerifyingPassword ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Confirm Execution
              </button>
            </form>
            <button 
              onClick={() => setShowPasswordModal(false)}
              disabled={isVerifyingPassword}
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}
      {certPatient && (
        <MedicalCertificateModal
          patient={certPatient}
          onClose={() => setCertPatient(null)}
        />
      )}

      {showConfirmCancelModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowConfirmCancelModal(null)} />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 md:p-10 w-full max-w-sm relative z-10 animate-in zoom-in-95 border border-rose-100 dark:border-rose-900/30 overflow-hidden text-center">
            <div className="mx-auto h-20 w-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mb-6">
               <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black dark:text-white tracking-tighter mb-2">Cancel {showConfirmCancelModal === 'REGISTER' ? 'Registration' : 'Vital Check'}?</h3>
            <p className="text-xs text-gray-500 font-bold mb-8">Are you sure you want to cancel? Any unsaved data will be lost.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmCancelModal(null)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs"
              >
                No, Keep Editing
              </button>
              <button 
                onClick={confirmCancel}
                className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all active:scale-[0.98] uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Patients;
