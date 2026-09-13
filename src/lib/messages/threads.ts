/**
 * Turning a flat list of messages into conversations.
 *
 * The data model already supported addressing specific people - `recipientIds`
 * has always been there - but the screen showed one undifferentiated stream, so
 * asking your sister something privately meant everyone read it. Grouping by
 * who is talking to whom is what makes it a chat rather than a noticeboard.
 */

import type { Message, FamilyMember } from "@/lib/db/schema";

/** The conversation everyone can see. */
export const EVERYONE = "everyone";

export interface Thread {
  id: string;
  title: string;
  /** Undefined for the shared thread. */
  memberId?: string;
  messages: Message[];
  lastAt: Date | null;
  unread: number;
}

/**
 * A message with no recipients is addressed to the whole family. Anything else
 * belongs to a conversation with the other person in it - whether the viewer
 * sent it or received it.
 */
export function threadIdFor(message: Message, viewerMemberId: string | null): string {
  if (!message.recipientIds || message.recipientIds.length === 0) return EVERYONE;
  if (message.senderId === viewerMemberId) return message.recipientIds[0];
  return message.senderId;
}

/** Is this message meant for the viewer at all? */
export function isVisibleTo(message: Message, viewerMemberId: string | null): boolean {
  if (!message.recipientIds || message.recipientIds.length === 0) return true;
  if (message.senderId === viewerMemberId) return true;
  return viewerMemberId !== null && message.recipientIds.includes(viewerMemberId);
}

function byTime(a: Message, b: Message) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function countUnread(
  messages: Message[],
  viewerMemberId: string | null,
  seenBefore: number
): number {
  return messages.filter(
    (m) => m.senderId !== viewerMemberId && new Date(m.createdAt).getTime() > seenBefore
  ).length;
}

export function buildThreads(
  messages: Message[],
  members: FamilyMember[],
  viewerMemberId: string | null,
  seenBefore = 0
): Thread[] {
  const byThread = new Map<string, Message[]>();

  for (const message of messages) {
    if (!isVisibleTo(message, viewerMemberId)) continue;
    const id = threadIdFor(message, viewerMemberId);
    byThread.set(id, [...(byThread.get(id) ?? []), message]);
  }

  // The shared thread always exists, even empty, so there is somewhere to post
  // an announcement on day one.
  const everyone = (byThread.get(EVERYONE) ?? []).sort(byTime);
  const shared: Thread = {
    id: EVERYONE,
    title: "Everyone",
    messages: everyone,
    lastAt: everyone.length ? new Date(everyone[everyone.length - 1].createdAt) : null,
    unread: countUnread(everyone, viewerMemberId, seenBefore),
  };

  // A conversation per family member, whether or not anything has been said -
  // starting one should not require hunting for a "new message" button.
  const direct: Thread[] = members
    .filter((m) => m.id !== viewerMemberId)
    .map((member) => {
      const list = (byThread.get(member.id) ?? []).sort(byTime);
      return {
        id: member.id,
        title: member.name,
        memberId: member.id,
        messages: list,
        lastAt: list.length ? new Date(list[list.length - 1].createdAt) : null,
        unread: countUnread(list, viewerMemberId, seenBefore),
      };
    });

  // Busiest first, with Everyone pinned to the top.
  direct.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
  return [shared, ...direct];
}
