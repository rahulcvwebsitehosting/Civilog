
export type ODStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';
export type UserRole = 'student' | 'faculty';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  identification_no?: string;
  roll_no?: string;
  year?: string;
  department?: string;
  designation?: string;
  is_profile_complete?: boolean;
}

export interface TeamMember {
  name: string;
  register_no: string;
  roll_no: string;
  year: string;
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
  semester: string;
  event_title: string;
  organization_name: string;
  organization_location: string;
  event_type: string;
  event_date: string;
  status: ODStatus;
  registration_proof_url: string | null;
  payment_proof_url: string | null;
  event_poster_url: string | null;
  od_letter_url: string | null;
  geotag_photo_url: string | null;
  certificate_url: string | null;
  remarks: string | null;
  team_members: TeamMember[] | null;
}

export interface SubmissionFormData {
  student_name: string;
  register_no: string;
  roll_no: string;
  phone_number: string;
  year: string;
  semester: string;
  event_title: string;
  organization_name: string;
  organization_location: string;
  event_type: string;
  event_date: string;
  team_members: TeamMember[];
}
