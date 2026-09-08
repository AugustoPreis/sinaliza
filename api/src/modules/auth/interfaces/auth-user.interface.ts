import { RoleSummaryDTO } from '../../users/dtos/role-summary.dto';
import { EInstitutionalLink } from '../../users/enums/institutional-link.enum';

export interface IAuthUser {
  id: number;
  uuid: string;
  email: string;
  name: string;
  institutionalLink: EInstitutionalLink | null;
  status: string;
  roles: RoleSummaryDTO[];
  permissions: string[];
}
