/**
 * The pay calculator. Loads the small data file for this page only, reads
 * the visitor's choices from the page address, and updates the snapshot
 * cards in place. Every change is written back to the page address (so a
 * result can be shared) and announced to screen readers.
 */
import {
  outlookSnapshot,
  readChoices,
  snapshot,
  unpackOutlook,
  type OutlookSnapshot,
  unpackFigures,
  writeChoices,
  type CalculatorData,
  type Choices,
  type Snapshot,
} from '../lib/pay/calculator';
import { PERIOD_LABELS, type Period } from '../lib/pay/periods';
import type { PayFigures } from '../lib/pay/types';

interface Place {
  name: string;
  figures: PayFigures | undefined;
}

const $ = <T extends Element>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);

function fillCard(
  card: HTMLElement,
  name: string,
  snap: Snapshot,
  period: Period,
  comparedLabel: string,
  outlook?: { snap: OutlookSnapshot; comparedLabel: string },
) {
  const set = (field: string, text: string) => {
    const el = $<HTMLElement>(`[data-field="${field}"]`, card);
    if (el) el.textContent = text;
  };
  if (outlook) {
    set('outlook-heading', outlook.snap.heading);
    set('outlook-jobs', outlook.snap.jobs);
    set('outlook-growth', outlook.snap.growth);
    set('outlook-openings', outlook.snap.openings);
    set('outlook-compared-label', outlook.comparedLabel);
    set('outlook-compared', outlook.snap.comparedWith);
  }
  set('name', name);
  set('period', PERIOD_LABELS[period]);
  for (const row of snap.rows) set(row.key, row.value);
  set('jobs', snap.jobs);
  set('compared-label', comparedLabel);
  set('compared', snap.comparedWith);
  set('bar-text', snap.barText);
  const band = $<HTMLElement>('.snapshot__band', card);
  const marker = $<HTMLElement>('.snapshot__marker', card);
  if (band && marker) {
    if (snap.bar) {
      band.style.cssText = `left:${snap.bar.p25}%;width:${snap.bar.p75 - snap.bar.p25}%`;
      marker.style.cssText = `left:${snap.bar.median}%`;
    } else {
      band.style.cssText = 'display:none';
      marker.style.cssText = 'display:none';
    }
  }
  card.removeAttribute('data-empty');
}

function fillAreas(select: HTMLSelectElement, data: CalculatorData, stateSlug: string | undefined, chosen: string | undefined) {
  const state = data.states.find((s) => s.slug === stateSlug);
  select.replaceChildren(new Option('Whole state', ''));
  for (const code of state?.areas ?? []) select.add(new Option(data.areas[code]!.name, code));
  select.disabled = !state || state.areas.length === 0;
  select.value = chosen ?? '';
}

export async function startCalculator(): Promise<void> {
  const form = $<HTMLFormElement>('[data-calc-form]');
  const cardA = $<HTMLElement>('[data-snapshot="a"]');
  const cardB = $<HTMLElement>('[data-snapshot="b"]');
  const announce = $<HTMLElement>('[data-calc-announce]');
  const notice = $<HTMLElement>('[data-calc-notice]');
  if (!form || !cardA || !cardB || !announce || !notice) return;

  const fields = {
    state: $<HTMLSelectElement>('[data-calc="state"]', form)!,
    area: $<HTMLSelectElement>('[data-calc="area"]', form)!,
    vs: $<HTMLSelectElement>('[data-calc="vs"]', form)!,
    vsarea: $<HTMLSelectElement>('[data-calc="vsarea"]', form)!,
  };

  let data: CalculatorData;
  try {
    const response = await fetch(form.action.replace(/\/?$/, '').replace(/\/calculator$/, '/calculator-data.json'));
    data = (await response.json()) as CalculatorData;
  } catch {
    notice.textContent = 'The calculator could not load. The national figures below are still correct.';
    notice.hidden = false;
    return;
  }
  const national = unpackFigures(data.national);
  const outlook = data.outlook;
  const outlookYears = outlook ? { base: outlook.baseYear, projected: outlook.projectedYear } : undefined;
  const nationalOutlook = unpackOutlook(outlook?.national);
  // Projections are published for whole states, so an area shows its state's outlook.
  const outlookFor = (stateSlug: string | undefined) => {
    if (!outlook) return undefined;
    const state = data.states.find((s) => s.slug === stateSlug);
    if (!state) return { figures: nationalOutlook, scope: '' };
    return { figures: unpackOutlook(outlook.states[state.slug]), scope: state.name };
  };

  const place = (stateSlug: string | undefined, areaCode: string | undefined): Place => {
    const state = data.states.find((s) => s.slug === stateSlug);
    if (!state) return { name: 'United States', figures: national };
    if (areaCode && data.areas[areaCode]) return { name: data.areas[areaCode]!.name, figures: unpackFigures(data.areas[areaCode]!.figures) };
    return { name: state.name, figures: state.figures ? unpackFigures(state.figures) : undefined };
  };

  const currentChoices = (): Omit<Choices, 'ignored'> => ({
    state: fields.state.value || undefined,
    area: fields.area.value || undefined,
    compareState: fields.vs.value || undefined,
    compareArea: fields.vsarea.value || undefined,
    period: (new FormData(form).get('per') as Period | null) ?? 'year',
  });

  let ignoredNote = '';
  const render = (announceChange: boolean) => {
    const choices = currentChoices();
    // A state without statewide figures: point to its areas, which may have them.
    const missing = [
      [choices.state, choices.area],
      [choices.compareState, choices.compareArea],
    ]
      .map(([stateSlug, areaCode]) => data.states.find((s) => s.slug === stateSlug && !areaCode && !s.figures))
      .filter((s): s is NonNullable<typeof s> => !!s);
    const notes = [
      ignoredNote,
      ...missing.map(
        (s) =>
          `The survey has no statewide figures for ${s.name}.${s.areas.length ? ` Choose an area in ${s.name} to see its figures.` : ''}`,
      ),
    ].filter(Boolean);
    notice.textContent = notes.join(' ');
    notice.hidden = notes.length === 0;
    const a = place(choices.state, choices.area);
    const aSnap = snapshot(a.figures, choices.state ? national : undefined, 'the national median', choices.period);
    const aOut = outlookFor(choices.state);
    const aOutSnap =
      aOut && outlookYears
        ? outlookSnapshot(aOut.figures, aOut.scope, outlookYears, choices.state ? { figures: nationalOutlook, name: 'the US', isNation: true } : undefined)
        : undefined;
    fillCard(cardA, a.name, aSnap, choices.period, 'Median compared with the US', aOutSnap ? { snap: aOutSnap, comparedLabel: 'Growth compared with the US' } : undefined);

    let message = `${a.name}: median ${aSnap.rows[2]!.value} ${PERIOD_LABELS[choices.period].toLowerCase()}.`;
    if (choices.state) message += ` ${aSnap.comparedWith}.`;
    if (aOutSnap) message += ` Projected job growth ${aOutSnap.growth}.`;

    if (choices.compareState) {
      const b = place(choices.compareState, choices.compareArea);
      const bSnap = snapshot(b.figures, a.figures, a.name, choices.period);
      const bOut = outlookFor(choices.compareState);
      const aLabel = aOut?.scope || 'the US';
      const bOutSnap =
        bOut && outlookYears
          ? outlookSnapshot(bOut.figures, bOut.scope, outlookYears, { figures: aOut?.figures, name: aLabel, isNation: !choices.state })
          : undefined;
      fillCard(
        cardB,
        b.name,
        bSnap,
        choices.period,
        `Median compared with ${a.name}`,
        bOutSnap ? { snap: bOutSnap, comparedLabel: `Growth compared with ${aLabel}` } : undefined,
      );
      message += ` ${b.name}: median ${bSnap.rows[2]!.value}, ${bSnap.comparedWith}.`;
    } else {
      cardB.setAttribute('data-empty', '');
      const name = $<HTMLElement>('[data-field="name"]', cardB);
      if (name) name.textContent = 'Compare';
    }

    const query = writeChoices(choices);
    history.replaceState(null, '', `${location.pathname}${query}`);
    if (announceChange) announce.textContent = notes.length ? `${message} ${notes.join(' ')}` : message;
  };

  // Apply the choices in the page address.
  const initial = readChoices(location.search, data);
  fields.state.value = initial.state ?? '';
  fillAreas(fields.area, data, initial.state, initial.area);
  fields.vs.value = initial.compareState ?? '';
  fillAreas(fields.vsarea, data, initial.compareState, initial.compareArea);
  const radio = $<HTMLInputElement>(`input[name="per"][value="${initial.period}"]`, form);
  if (radio) radio.checked = true;
  if (initial.ignored.length) {
    ignoredNote = `Some choices in the page address were not recognized and were ignored (${initial.ignored.join(', ')}).`;
  }
  render(false);

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target === fields.state) fillAreas(fields.area, data, fields.state.value || undefined, undefined);
    if (target === fields.vs) fillAreas(fields.vsarea, data, fields.vs.value || undefined, undefined);
    render(true);
  });
  form.addEventListener('submit', (event) => event.preventDefault());
}
