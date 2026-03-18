
import { supabase } from '../supabaseClient';

export type AuditAction = 
  | 'CREATE_OD' 
  | 'UPDATE_OD' 
  | 'DELETE_OD' 
  | 'APPROVE_ADVISOR' 
  | 'APPROVE_HOD' 
  | 'REJECT_OD' 
  | 'RESTORE_OD'
  | 'ARCHIVE_OD'
  | 'UPDATE_PROFILE'
  | 'UPDATE_ACHIEVEMENT'
  | 'MANUAL_NOTIFICATION'
  | 'LOGIN';

export const logAudit = async (
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: any = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    });

    if (error) console.error('Audit Log Error:', error);
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
};
