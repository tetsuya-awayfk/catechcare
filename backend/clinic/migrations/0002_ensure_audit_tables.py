# Safe migration: ensures the audit schema and tables exist regardless of DB state.
# Uses CREATE IF NOT EXISTS so it's completely idempotent.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clinic', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE SCHEMA IF NOT EXISTS audit;

                CREATE TABLE IF NOT EXISTS "audit"."login_logs" (
                    id BIGSERIAL PRIMARY KEY,
                    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    logout_time TIMESTAMPTZ,
                    ip_address INET,
                    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
                    user_id BIGINT NOT NULL REFERENCES clinic_user(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS "audit"."action_logs" (
                    id BIGSERIAL PRIMARY KEY,
                    action VARCHAR(50) NOT NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(50),
                    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    details TEXT,
                    user_id BIGINT REFERENCES clinic_user(id) ON DELETE CASCADE
                );

                -- Clean up orphaned migration record from the deleted 0002 if it exists
                DELETE FROM django_migrations
                WHERE app = 'clinic'
                  AND name = '0002_alter_actionlog_table_alter_loginlog_table';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
