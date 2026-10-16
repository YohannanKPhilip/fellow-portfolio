export function SubjectTag({ subject, raised = false }: { subject: string; raised?: boolean }) {
  const cls = ['tag', subject === 'Maths' && 'tag--accent', raised && 'tag--raised']
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{subject}</span>;
}
