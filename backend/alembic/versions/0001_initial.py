"""initial schema: members, payments, commissions, payouts, RBAC, audit

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ['admin_users', 'announcements', 'audit_logs', 'commission_ledger', 'commission_rules', 'member_bank_details', 'member_kyc', 'member_profiles', 'members', 'nominees', 'notifications', 'payment_gateway_transactions', 'payment_plans', 'payments', 'payouts', 'permissions', 'role_permissions', 'roles', 'system_counters']
ENUM_TYPES = ['actor_type', 'commission_status', 'kyc_status', 'member_status', 'notification_channel', 'notification_status', 'payment_mode', 'payment_status', 'payout_mode', 'payout_status', 'plan_status']


def upgrade() -> None:
    op.create_table('announcements',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('publish_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('audit_logs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('actor_type', sa.Enum('MEMBER', 'ADMIN', 'SYSTEM', name='actor_type'), nullable=False),
    sa.Column('actor_id', sa.String(length=64), nullable=False),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('entity_name', sa.String(length=100), nullable=False),
    sa.Column('entity_id', sa.String(length=64), nullable=False),
    sa.Column('before_snapshot', sa.JSON(), nullable=True),
    sa.Column('after_snapshot', sa.JSON(), nullable=True),
    sa.Column('ip_address', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'], unique=False)
    op.create_table('commission_rules',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('level', sa.Integer(), nullable=False),
    sa.Column('percentage', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_commission_rules_level', 'commission_rules', ['level'], unique=False)
    op.create_table('members',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_code', sa.String(length=20), nullable=False),
    sa.Column('full_name', sa.String(length=200), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('sponsor_id', sa.Uuid(), nullable=True),
    sa.Column('status', sa.Enum('ACTIVE', 'PENDING', 'SUSPENDED', name='member_status'), nullable=False),
    sa.Column('doj', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['sponsor_id'], ['members.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('member_code'),
    sa.UniqueConstraint('phone')
    )
    op.create_index('ix_members_sponsor_id', 'members', ['sponsor_id'], unique=False)
    op.create_table('permissions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('code', sa.String(length=100), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )
    op.create_table('roles',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('system_counters',
    sa.Column('key', sa.String(length=50), nullable=False),
    sa.Column('value', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('admin_users',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('username', sa.String(length=100), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=200), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('username')
    )
    op.create_table('member_bank_details',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('bank_name', sa.String(length=200), nullable=False),
    sa.Column('branch', sa.String(length=200), nullable=True),
    sa.Column('account_number_encrypted', sa.String(length=500), nullable=False),
    sa.Column('ifsc_code', sa.String(length=20), nullable=False),
    sa.Column('upi_id', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('member_id')
    )
    op.create_table('member_kyc',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('aadhaar_encrypted', sa.String(length=500), nullable=True),
    sa.Column('pan_encrypted', sa.String(length=500), nullable=True),
    sa.Column('status', sa.Enum('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED', name='kyc_status'), nullable=False),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('member_id')
    )
    op.create_table('member_profiles',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('dob', sa.DateTime(timezone=True), nullable=True),
    sa.Column('address', sa.String(length=500), nullable=True),
    sa.Column('city', sa.String(length=100), nullable=True),
    sa.Column('state', sa.String(length=100), nullable=True),
    sa.Column('pincode', sa.String(length=10), nullable=True),
    sa.Column('photo_url', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('member_id')
    )
    op.create_table('nominees',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('full_name', sa.String(length=200), nullable=False),
    sa.Column('relationship', sa.String(length=100), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('member_id')
    )
    op.create_table('notifications',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('channel', sa.Enum('IN_APP', 'SMS', 'EMAIL', name='notification_channel'), nullable=False),
    sa.Column('status', sa.Enum('QUEUED', 'SENT', 'FAILED', name='notification_status'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_member_id', 'notifications', ['member_id'], unique=False)
    op.create_table('payment_plans',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('committed_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.Enum('ACTIVE', 'SUPERSEDED', name='plan_status'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_payment_plans_member_id', 'payment_plans', ['member_id'], unique=False)
    op.create_table('payments',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('status', sa.Enum('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', name='payment_status'), nullable=False),
    sa.Column('mode', sa.Enum('ONLINE_RAZORPAY', 'MANUAL_ADMIN', name='payment_mode'), nullable=False),
    sa.Column('transaction_id', sa.String(length=100), nullable=False),
    sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('amount > 0', name='ck_payments_amount_positive'),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('transaction_id')
    )
    op.create_index('ix_payments_member_id', 'payments', ['member_id'], unique=False)
    op.create_table('payouts',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('member_id', sa.Uuid(), nullable=False),
    sa.Column('reference_no', sa.String(length=40), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('payment_mode', sa.Enum('UPI', 'BANK_TRANSFER', name='payout_mode'), nullable=False),
    sa.Column('account_details_masked', sa.String(length=255), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', name='payout_status'), nullable=False),
    sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('admin_note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('amount > 0', name='ck_payouts_amount_positive'),
    sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('reference_no')
    )
    op.create_index('ix_payouts_member_id', 'payouts', ['member_id'], unique=False)
    op.create_table('role_permissions',
    sa.Column('role_id', sa.Uuid(), nullable=False),
    sa.Column('permission_id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )
    op.create_table('commission_ledger',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('payment_id', sa.Uuid(), nullable=False),
    sa.Column('beneficiary_id', sa.Uuid(), nullable=False),
    sa.Column('source_member_id', sa.Uuid(), nullable=False),
    sa.Column('level', sa.Integer(), nullable=False),
    sa.Column('applied_rate', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('base_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('earned_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('status', sa.Enum('CREDITED', 'REVERSED', name='commission_status'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['beneficiary_id'], ['members.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['source_member_id'], ['members.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_commission_ledger_beneficiary_id', 'commission_ledger', ['beneficiary_id'], unique=False)
    op.create_index('ix_commission_ledger_payment_id', 'commission_ledger', ['payment_id'], unique=False)
    op.create_index('ix_commission_ledger_source_member_id', 'commission_ledger', ['source_member_id'], unique=False)
    op.create_table('payment_gateway_transactions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('payment_id', sa.Uuid(), nullable=False),
    sa.Column('gateway_status', sa.String(length=50), nullable=False),
    sa.Column('raw_payload', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('payment_id')
    )

    # Supabase exposes every table in the public schema through its REST API
    # (PostgREST) to anyone holding the project's public/anon key. This API
    # connects as the database owner, which bypasses RLS, so enabling RLS with
    # NO policies locks the REST route out completely (KYC, bank and payment
    # data must never be readable that way).
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    op.drop_table('payment_gateway_transactions')
    op.drop_index('ix_commission_ledger_source_member_id', table_name='commission_ledger')
    op.drop_index('ix_commission_ledger_payment_id', table_name='commission_ledger')
    op.drop_index('ix_commission_ledger_beneficiary_id', table_name='commission_ledger')
    op.drop_table('commission_ledger')
    op.drop_table('role_permissions')
    op.drop_index('ix_payouts_member_id', table_name='payouts')
    op.drop_table('payouts')
    op.drop_index('ix_payments_member_id', table_name='payments')
    op.drop_table('payments')
    op.drop_index('ix_payment_plans_member_id', table_name='payment_plans')
    op.drop_table('payment_plans')
    op.drop_index('ix_notifications_member_id', table_name='notifications')
    op.drop_table('notifications')
    op.drop_table('nominees')
    op.drop_table('member_profiles')
    op.drop_table('member_kyc')
    op.drop_table('member_bank_details')
    op.drop_table('admin_users')
    op.drop_table('system_counters')
    op.drop_table('roles')
    op.drop_table('permissions')
    op.drop_index('ix_members_sponsor_id', table_name='members')
    op.drop_table('members')
    op.drop_index('ix_commission_rules_level', table_name='commission_rules')
    op.drop_table('commission_rules')
    op.drop_index('ix_audit_logs_actor_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_table('announcements')
    for enum_name in ENUM_TYPES:
        op.execute(f'DROP TYPE IF EXISTS "{enum_name}"')
