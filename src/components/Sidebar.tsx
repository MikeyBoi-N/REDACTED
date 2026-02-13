/**
 * Sidebar component — philosophy blurb and pricing info.
 * Matches the left panel in the Figma mockup.
 *
 * Inputs: None
 * Outputs: Rendered sidebar
 * Side Effects: None
 */

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col gap-4 w-60 shrink-0 pt-20 pl-4 pr-2 text-neutral-400 text-xs leading-relaxed">
      {/* Philosophy Block 1 */}
      <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800/50">
        <p>
          Freedom, censorship, knowledge, mystery, hate, love. This is a
          philosophical project.
        </p>
        <p className="mt-1">A study.</p>
        <p>An art piece.</p>
        <p>A mirror.</p>
      </div>

      {/* Philosophy Block 2 */}
      <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800/50">
        <p>
          It&apos;s absurd, stupid, a waste, but it&apos;s insightful to who we are as
          humans.
        </p>
      </div>

      {/* Philosophy Block 3 */}
      <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800/50">
        <p>
          This isn&apos;t AI; humans write the next word. It&apos;s not a damn algorithm.
          It&apos;s YOU. What will you write?
        </p>
      </div>

      {/* Pricing Info */}
      <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800/50">
        <p className="font-medium text-neutral-300 mb-2">Pricing</p>
        <ul className="space-y-1.5">
          <li>$1 to write a word (20 letters max)</li>
          <li>$2 to [ REDACT ] a word</li>
          <li>$2 to uncover a [ REDACTED ] word</li>
          <li className="text-neutral-500">
            Free to flag a word you don&apos;t like. Enough flags reduce its
            visibility
          </li>
        </ul>
      </div>
    </aside>
  );
}
