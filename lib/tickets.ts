export const TICKET_PRICE = 40;

// Single ticket type — keeping the shape for API compatibility
export const TICKET_TYPES = {
  general: {
    id: 'general',
    name: 'General Admission',
    price: TICKET_PRICE,
    description: 'Buffet · Unlimited drinks · Music · Dance floor',
    peoplePerTicket: 1,
  },
} as const;

export type TicketTypeId = keyof typeof TICKET_TYPES;

export function calculateAmount(_typeId: TicketTypeId, count: number): number {
  return TICKET_PRICE * count;
}

export function calculatePeopleCount(_typeId: TicketTypeId, count: number): number {
  return count;
}
