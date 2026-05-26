import React from "react";

export type ValhallaSidebarSection = "forge" | "systems" | "runtime" | "memory" | "ai" | "devices";

const navItems: Array<{ id: ValhallaSidebarSection; label: string }> = [
  { id: "forge", label: "Forge" },
  { id: "systems", label: "Systems" },
  { id: "runtime", label: "Runtime" },
  { id: "memory", label: "Memory" },
  { id: "ai", label: "AI" },
  { id: "devices", label: "Devices" }
];

type ValhallaSidebarProps = {
  activeSection: ValhallaSidebarSection | null;
  onSelectSection: (section: ValhallaSidebarSection) => void;
};

export function ValhallaSidebar({ activeSection, onSelectSection }: ValhallaSidebarProps) {
  return (
    <aside className="valhalla-sidebar">
      <nav>
        {navItems.map((item) => (
          <button key={item.id} type="button" className={activeSection === item.id ? "nav-item active" : "nav-item"} onClick={() => onSelectSection(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
