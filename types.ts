
export type ODStatus = 'Pending Coordinator' | 'Pending HOD' | 'Approved' | 'Rejected' | 'Completed' | 'Archived' | 'Pending';
export type UserRole = 'student' | 'coordinator' | 'hod' | 'admin' | 'faculty';

export interface Notification {
  id: string;
  user_id: string;
  created_at: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  identification_no?: string;
  roll_no?: string;
  phone_number?: string;
  year?: string;
  semester?: string;
  department?: string;
  designation?: string;
  is_hod?: boolean;
  is_profile_complete?: boolean;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
}

export interface TeamMember {
  name: string;
  register_no: string;
  roll_no: string;
  year: string;
  department: string;
}

export interface ODRequest {
  id: string;
  user_id: string;
  created_at: string;
  student_name: string;
  register_no: string;
  roll_no: string;
  phone_number: string;
  year: string;
  department?: string;
  semester: string;
  event_title: string;
  organization_name: string;
  organization_location: string;
  event_type: string;
  event_date: string;
  event_end_date: string | null;
  status: ODStatus;
  registration_proof_url: string | null;
  payment_proof_url: string | null;
  event_poster_url: string | null;
  od_letter_url: string | null;
  achievement_details: string | null;
  coordinator_id?: string | null;
  hod_id?: string | null;
  coordinator_approved_at?: string | null;
  hod_approved_at?: string | null;
  // Legacy single fields (kept for compatibility)
  geotag_photo_url: string | null;
  certificate_url: string | null;
  // New plural fields for multiple evidence
  geotag_photo_urls: string[] | null;
  certificate_urls: string[] | null;
  // Removed: prize_certificate_urls: string[] | null;
  // New structured prize details
  prize_details: { type: string; event: string; url: string; }[] | null;
  remarks: string | null;
  team_members: TeamMember[] | null;
  notification_sent?: boolean;
}

export interface SubmissionFormData {
  student_name: string;
  register_no: string;
  roll_no: string;
  phone_number: string;
  year: string;
  department: string;
  semester: string;
  event_title: string;
  organization_name: string;
  organization_location: string;
  event_type: string;
  event_date: string;
  event_end_date: string;
  team_members: TeamMember[];
}
