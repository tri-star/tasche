import { Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SUPPORTED_TIMEZONES } from "@/lib/timezones"
import { cn } from "@/lib/utils"

type TimezoneComboboxProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}

/**
 * IANA タイムゾーン一覧から選ぶ Combobox（Popover + Command の合成）。
 */
export function TimezoneCombobox({ value, onChange, disabled, id }: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false)
  const timezones = SUPPORTED_TIMEZONES

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-[280px] justify-between"
        >
          {value || "タイムゾーンを選択"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="検索..." />
          <CommandList>
            <CommandEmpty>該当なし</CommandEmpty>
            <CommandGroup>
              {timezones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={(selected) => {
                    onChange(selected)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === tz ? "opacity-100" : "opacity-0")}
                  />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
