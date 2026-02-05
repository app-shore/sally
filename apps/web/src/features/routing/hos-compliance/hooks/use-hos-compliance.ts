import { useMutation } from '@tanstack/react-query';
import { hosComplianceApi } from '../api';
import type { HOSValidationRequest } from '../types';

export function useHOSValidation() {
  return useMutation({
    mutationFn: (request: HOSValidationRequest) => hosComplianceApi.validate(request),
  });
}
