// app/configuration/event-types/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import EventTypeConfigClient from './EventTypeConfigClient';

export default async function EventTypeConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);
  const eventTypes = await prisma.eventTypeConfig.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });
  return <EventTypeConfigClient initialEventTypes={eventTypes} locations={locations} />;
}
