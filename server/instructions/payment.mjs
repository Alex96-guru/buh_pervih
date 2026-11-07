import { pool } from '../db/pool.mjs'

// A future bank callback must verify its signature before calling this function.
export async function confirmInstructionPayment(purchaseId, provider, method) {
  const { rows } = await pool.query(
    `UPDATE instruction_purchases
        SET status = 'paid', payment_provider = $2, payment_method = $3, paid_at = now()
      WHERE id = $1 AND status = 'pending'
      RETURNING id, instruction_title, amount, status, paid_at, access_expires_at`,
    [purchaseId, provider, method],
  )
  return rows[0] ?? null
}
