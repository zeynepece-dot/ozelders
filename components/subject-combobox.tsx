"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PRESET_SUBJECTS = ["Matematik", "Türkçe", "Fen bilimleri", "Fizik", "Kimya", "Biyoloji", "İngilizce"];

function normalizeSubject(value: string) {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return "";

  return compact
    .split(" ")
    .map((word) =>
      `${word.charAt(0).toLocaleUpperCase("tr-TR")}${word.slice(1).toLocaleLowerCase("tr-TR")}`,
    )
    .join(" ");
}

function normalizeForCompare(value: string) {
  return normalizeSubject(value).toLocaleLowerCase("tr-TR");
}

export function SubjectCombobox({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedQuery = useMemo(() => normalizeSubject(search), [search]);
  const queryLower = useMemo(() => normalizeForCompare(search), [search]);

  const presets = useMemo(
    () => PRESET_SUBJECTS.filter((subject) => normalizeForCompare(subject).includes(queryLower)),
    [queryLower],
  );

  const canCreate =
    normalizedQuery.length > 0 &&
    !PRESET_SUBJECTS.some((subject) => normalizeForCompare(subject) === normalizeForCompare(normalizedQuery));

  const selectValue = (next: string) => {
    onChange(normalizeSubject(next));
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value || "Ders seç veya yaz…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Ders ara…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Ders bulunamadı</CommandEmpty>
            <CommandGroup>
              {canCreate ? (
                <CommandItem value={`new-${normalizedQuery}`} onSelect={() => selectValue(normalizedQuery)}>
                  <Check className="h-4 w-4 opacity-0" />
                  <span>Yeni ders olarak ekle: {normalizedQuery}</span>
                </CommandItem>
              ) : null}
              {presets.map((subject) => (
                <CommandItem key={subject} value={subject} onSelect={() => selectValue(subject)}>
                  <Check className={cn("h-4 w-4", value === subject ? "opacity-100" : "opacity-0")} />
                  <span>{subject}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
