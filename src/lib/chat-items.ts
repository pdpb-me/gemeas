// A proposal shows under the coach's words about it: the first reply saved after it.
// Until that reply is saved, or if it never is, it shows at the end.
export function placeProposals<P extends { created_at: string }>(messages: { id: string; role: string; created_at: string }[], proposals: P[]) {
  const under = new Map<string, P[]>()
  const atEnd: P[] = []
  for (const proposal of proposals) {
    const at = Date.parse(proposal.created_at)
    const reply = messages.find((m) => m.role === 'coach' && Date.parse(m.created_at) >= at)
    if (reply) under.set(reply.id, [...(under.get(reply.id) ?? []), proposal])
    else atEnd.push(proposal)
  }
  return { under, atEnd }
}
