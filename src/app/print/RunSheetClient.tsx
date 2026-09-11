"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Settings2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useWedding, useEvents, useVendors, useFamilyMembers,
} from "@/lib/db/hooks";
import { formatDate, formatTime } from "@/lib/utils";

/**
 * A running order that can be printed and handed to people who will never
 * install the app.
 *
 * The priest, the caterer and the venue manager all need to know what happens
 * when, and none of them are going to join a sync room. Everything here comes
 * from the same data the app already holds, laid out for paper: no navigation,
 * no colour that costs ink, and page breaks that fall between days rather than
 * through the middle of a ceremony.
 */
export default function RunSheetClient() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(true);
  const [includeVendors, setIncludeVendors] = useState(true);
  const [includeChecklists, setIncludeChecklists] = useState(false);
  const [includeFamily, setIncludeFamily] = useState(true);
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("kalyanam_wedding_id");
    if (!stored) {
      router.push("/login");
      return;
    }
    setWeddingId(stored);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const events = useEvents(weddingId ?? undefined);
  const vendors = useVendors(weddingId ?? undefined);
  const family = useFamilyMembers(weddingId ?? undefined);

  /** Ceremonies grouped by day, each day sorted by start time. */
  const days = useMemo(() => {
    const relevant = (events ?? [])
      .filter((e) => e.status !== "cancelled")
      .filter((e) => !onlyUpcoming || new Date(e.date) >= new Date(new Date().toDateString()));

    const byDay = new Map<string, typeof relevant>();
    for (const event of relevant) {
      const key = new Date(event.date).toDateString();
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }

    return Array.from(byDay.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([day, list]) => ({
        day,
        events: list.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")),
      }));
  }, [events, onlyUpcoming]);

  const nameOf = (id: string) => family?.find((m) => m.id === id)?.name;

  // Ritual templates ship without times, and a running order with no times is
  // only half useful to a priest or a caterer. Worth saying so once, on screen.
  const withoutTimes = (events ?? []).filter((e) => !e.startTime).length;

  if (!weddingId || !wedding) return null;

  return (
    <main className="min-h-screen bg-background">
      {/* Controls - never printed */}
      <div className="no-print border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Button variant="ghost" onClick={() => router.push("/events")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowOptions((v) => !v)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Options
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {withoutTimes > 0 && (
          <div className="container mx-auto px-4 pb-4">
            <p className="text-sm text-muted-foreground flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
              <span>
                {withoutTimes} ceremon{withoutTimes === 1 ? "y has" : "ies have"} no start time,
                so {withoutTimes === 1 ? "it shows" : "they show"} as a dash. Add times on the
                event pages - a running order without them is of limited use to a priest or a
                caterer.
              </span>
            </p>
          </div>
        )}

        {showOptions && (
          <div className="container mx-auto px-4 pb-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What to include</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Who is responsible", includeFamily, setIncludeFamily],
                  ["Vendor contacts", includeVendors, setIncludeVendors],
                  ["Ceremony checklists", includeChecklists, setIncludeChecklists],
                  ["Only from today onwards", onlyUpcoming, setOnlyUpcoming],
                ].map(([label, value, set]) => (
                  <label key={String(label)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
                      className="w-4 h-4 accent-current"
                    />
                    {label as string}
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* The sheet itself */}
      <article className="run-sheet container mx-auto px-4 py-8 max-w-3xl">
        <header className="text-center border-b-2 border-current pb-4 mb-6">
          <h1 className="text-3xl font-display font-bold">{wedding.name}</h1>
          <p className="text-lg mt-1">
            {wedding.brideName} &amp; {wedding.groomName}
          </p>
          <p className="text-sm mt-2">
            {formatDate(wedding.weddingDate, "long")}
            {wedding.venue ? ` · ${wedding.venue}` : ""}
            {wedding.city ? `, ${wedding.city}` : ""}
          </p>
        </header>

        {days.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No ceremonies to show.
          </p>
        ) : (
          days.map(({ day, events: dayEvents }) => (
            <section key={day} className="day-block mb-8">
              <h2 className="text-xl font-display font-bold border-b border-current pb-1 mb-3">
                {formatDate(new Date(day), "long")}
              </h2>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-current">
                    <th className="py-1.5 pr-3 w-24">Time</th>
                    <th className="py-1.5 pr-3">Ceremony</th>
                    <th className="py-1.5">Where</th>
                  </tr>
                </thead>
                <tbody>
                  {dayEvents.map((event) => (
                    <tr key={event.id} className="event-row border-b border-current/30 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap font-medium">
                        {event.startTime ? formatTime(event.startTime) : "—"}
                        {event.endTime && (
                          <span className="block text-xs font-normal">
                            to {formatTime(event.endTime)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="font-medium">{event.name}</span>
                        {event.localName && <span className="ml-1.5">({event.localName})</span>}
                        {event.description && (
                          <span className="block text-xs mt-0.5">{event.description}</span>
                        )}
                        {includeFamily && event.assignedTo && event.assignedTo.length > 0 && (
                          <span className="block text-xs mt-1 font-medium">
                            Responsible: {event.assignedTo.map(nameOf).filter(Boolean).join(", ")}
                          </span>
                        )}
                        {includeChecklists && event.checklist && event.checklist.length > 0 && (
                          <ul className="mt-1.5 text-xs list-none space-y-0.5">
                            {event.checklist.map((item) => (
                              <li key={item.id}>☐ {item.text}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-2 text-xs">
                        {event.venue || wedding.venue || "—"}
                        {event.address && <span className="block">{event.address}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}

        {includeVendors && vendors && vendors.length > 0 && (
          <section className="day-block mb-8">
            <h2 className="text-xl font-display font-bold border-b border-current pb-1 mb-3">
              Vendor contacts
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-current/30">
                    <td className="py-1.5 pr-3 font-medium">{vendor.name}</td>
                    <td className="py-1.5 pr-3 text-xs">{vendor.category}</td>
                    <td className="py-1.5 text-xs whitespace-nowrap">
                      {vendor.contactPerson && <span className="block">{vendor.contactPerson}</span>}
                      {vendor.phone || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {includeFamily && family && family.length > 0 && (
          <section className="day-block">
            <h2 className="text-xl font-display font-bold border-b border-current pb-1 mb-3">
              Family contacts
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {family.map((member) => (
                  <tr key={member.id} className="border-b border-current/30">
                    <td className="py-1.5 pr-3 font-medium">{member.name}</td>
                    <td className="py-1.5 pr-3 text-xs">{member.relation}</td>
                    <td className="py-1.5 text-xs whitespace-nowrap">{member.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-8 pt-3 border-t border-current text-xs text-center">
          Printed {formatDate(new Date(), "long")} · Kalyanam
        </footer>
      </article>
    </main>
  );
}
