// The existing admin@gmail.com account belongs to Olga. An environment override
// remains available if the account is changed later.
export const instructionManagerEmail = process.env.INSTRUCTION_MANAGER_EMAIL?.trim().toLowerCase() || 'admin@gmail.com'

export function isInstructionManager(user) {
  return user?.role === 'admin' && user.email?.toLowerCase() === instructionManagerEmail
}
