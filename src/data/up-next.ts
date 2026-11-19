/**
 * The "Up next" choices for each kind of page, in order of preference.
 * The UpNext block shows the first one or two whose pages exist.
 */
type Step = { label: string; href: string; text: string };

export function upNext(page: string, profession: string, name: string): Step[] {
  const p = `/${profession}`;
  const lower = name.toLowerCase();
  const steps = {
    salary: { label: `${name} salary guide`, href: `${p}/salary/`, text: 'The national salary, the salary range and the salary in every state.' },
    calculator: { label: 'Salary calculator', href: `${p}/salary/calculator/`, text: 'Compare the salary in any two states or areas, per hour, week, month or year.' },
    become: { label: `How to become a ${lower}`, href: `${p}/how-to-become/`, text: 'The usual steps from training to a license.' },
    states: { label: 'Salary in each state', href: `${p}/#states`, text: 'A page for every state and DC, with the local salary and licensing.' },
    licensing: { label: 'Licensing by state', href: `${p}/licensing/`, text: 'How licensing works, and the rules in each state.' },
    schools: { label: 'Schools by state', href: `${p}/schools/`, text: 'Colleges in each state that reported awards, with national totals.' },
    exam: { label: 'The national board exam', href: `${p}/board-exam/`, text: 'What the national written exam is.' },
    overview: { label: `${name} overview`, href: `${p}/`, text: 'Salary, training and licensing at a glance.' },
  } satisfies Record<string, Step>;

  const order: Record<string, (keyof typeof steps)[]> = {
    state: ['salary', 'become', 'calculator', 'overview'],
    salary: ['calculator', 'states', 'become'],
    calculator: ['salary', 'become', 'states'],
    become: ['licensing', 'schools', 'exam', 'states'],
    overview: ['become', 'salary', 'calculator'],
    schools: ['licensing', 'become', 'states'],
    licensing: ['exam', 'become', 'states'],
    exam: ['licensing', 'become', 'states'],
  };
  return (order[page] ?? ['overview']).map((key) => steps[key]);
}
