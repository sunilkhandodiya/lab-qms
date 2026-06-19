'use client';
// app/calibration/GatedForm.js — wraps VerifyForm with a permission gate.
import { CanDo } from '@/components/RoleGuard';
import VerifyForm from './VerifyForm';

export default function GatedForm({ permission = 'calibration:add', ...props }) {
  return (
    <CanDo permission={permission}>
      <VerifyForm {...props} />
    </CanDo>
  );
}
