import { useMemo } from "react";
import { VaultProvider, useVault } from "./store";
import { INSTRUMENTS } from "./parts";
import { Harvester } from "./Harvester";
import { OrreryView } from "./OrreryView";
import { Metabolizer } from "./Metabolizer";
import { BoneFlute } from "./BoneFlute";
import { PORCH_IDS } from "@/lib/orrery/sample";

function Shell() {
  const vault = useVault();
  const count = Object.keys(vault.objects).length;
  const pins = vault.pins.map((id) => vault.objects[id]).filter(Boolean);
  const titles = useMemo(() => pins.map((obj) => obj.artifact?.title ?? obj.title ?? "untitled"), [pins]);

  const pinPair = () => {
    const all = Object.values(vault.objects);
    const rosemary = all.find((obj) => obj.artifact?.externalId === PORCH_IDS.rosemary);
    const porch = all.find((obj) => obj.artifact?.externalId === PORCH_IDS.porch);
    if (!rosemary || !porch) {
      vault.setError("The observed porch pair is not in this vault.");
      return;
    }
    vault.setPins([rosemary.id, porch.id]);
    vault.setInstrument("metabolizer");
    vault.setNotice("Pinned Rosemary Bloom and Where the Porch Boards Bend. These are observed links, not a generated history.");
  };

  return (
    <div className="flex h-dvh flex-col bg-ink text-bone">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-widest text-mute">LOCAL INSTRUMENT · NO SCRAPE · NO MODEL</p>
          <h1 className="truncate font-serif text-3xl leading-none">Fossil Orrery</h1>
        </div>
        <p className="shrink-0 text-right font-mono text-xs text-mute">
          {count}
          <span className="block">records</span>
        </p>
      </header>
      {(vault.notice || vault.error) && (
        <div className="border-b border-line px-4 py-2 font-mono text-xs" role="status">
          {vault.error ? <p className="text-amber">{vault.error}</p> : <p className="text-mute">{vault.notice}</p>}
        </div>
      )}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-line px-3 py-2">
        <button className="btn shrink-0" data-testid="pin-porch-pair" onClick={pinPair} type="button">
          Pin observed porch pair
        </button>
        {titles.length === 0 && <span className="font-mono text-xs text-mute">Nothing pinned</span>}
        {titles.map((title, index) => (
          <span key={vault.pins[index]} className="shrink-0 rounded-full border border-line px-3 py-2 font-mono text-xs text-bone">
            {title}
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-44 shrink-0 flex-col gap-1 border-r border-line p-2 md:flex">
          {INSTRUMENTS.map((item) => (
            <NavButton key={item.id} id={item.id} />
          ))}
        </nav>
        <main className="min-w-0 flex-1 overflow-hidden">
          {!vault.ready && <p className="p-6 font-serif text-2xl">Opening the trench…</p>}
          {vault.ready && vault.instrument === "harvester" && <Harvester />}
          {vault.ready && vault.instrument === "orrery" && <OrreryView />}
          {vault.ready && vault.instrument === "metabolizer" && <Metabolizer />}
          {vault.ready && vault.instrument === "maddclown" && <BoneFlute />}
        </main>
      </div>
      <nav className="grid grid-cols-4 border-t border-line md:hidden">
        {INSTRUMENTS.map((item) => (
          <NavButton key={item.id} id={item.id} compact />
        ))}
      </nav>
    </div>
  );
}

function NavButton({ id, compact = false }: { id: Instrument; compact?: boolean }) {
  const vault = useVault();
  const item = INSTRUMENTS.find((entry) => entry.id === id)!;
  const active = vault.instrument === id;
  const Icon = item.icon;
  return (
    <button
      aria-pressed={active}
      className={`flex min-h-11 items-center gap-2 px-2 py-2 text-left font-mono text-xs ${active ? "bg-raised text-amber" : "text-mute"}`}
      data-testid={`instrument-${id}`}
      onClick={() => vault.setInstrument(id)}
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
      <span>
        {compact ? item.hint : item.label}
        {!compact && <span className="block text-mute">{item.hint}</span>}
      </span>
    </button>
  );
}

export function OrreryApp() {
  return (
    <VaultProvider>
      <Shell />
    </VaultProvider>
  );
}
