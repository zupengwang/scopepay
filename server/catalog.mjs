export const catalog = [
  { id: 'discovery', name: 'Discovery workshop', unit: 'session', unitCents: 15000, description: 'One 60-minute strategy session and a written project brief.' },
  { id: 'landing', name: 'Landing page', unit: 'page', unitCents: 60000, description: 'One responsive landing page, up to 6 sections. Includes design and implementation; excludes copywriting, hosting and domain fees.' },
  { id: 'copy', name: 'Website copywriting', unit: 'page', unitCents: 18000, description: 'Up to 700 words of original copy for one web page.' },
  { id: 'brand', name: 'Brand starter kit', unit: 'kit', unitCents: 35000, description: 'A wordmark, color palette and typography guide. No trademark clearance.' },
  { id: 'social', name: 'Social launch pack', unit: 'pack', unitCents: 12000, description: 'Five static social graphics in one visual direction.' },
  { id: 'revision', name: 'Extra revision round', unit: 'round', unitCents: 9000, description: 'One consolidated revision round beyond the one round included in each deliverable.' },
  { id: 'maintenance', name: 'Website care', unit: 'month', unitCents: 7500, description: 'Up to one hour of fixes per month. One-time prepayment; no recurring subscription is created.' }
];
export const examples = [
  { name: 'A café launch', client: 'Maya · Daybreak Coffee', brief: 'We are launching Daybreak Coffee. We need one responsive landing page, copywriting for that page, and five Instagram launch graphics. Our brand is already finished. Please use your standard scope; we do not need ongoing maintenance.' },
  { name: 'A personal brand', client: 'Alex · Independent designer', brief: 'I need a brand starter kit and one landing page for my design portfolio. I will supply all website copy. Please include a discovery session and two additional revision rounds.' },
  { name: 'An unclear brief', client: 'Sam · New venture', brief: 'Can you make us a website and some social posts? We also need an online store, but we have not decided the number of pages, products, or posts yet.' }
];
export const sampleProposal = {
  scopeStatus: 'ready',
  title: 'A brighter launch for Daybreak', summary: 'A focused launch package: one landing page, clear café copy, and a coordinated social launch.',
  items: [{ serviceId: 'landing', quantity: 1, rationale: 'One responsive page explicitly requested.' }, { serviceId: 'copy', quantity: 1, rationale: 'Copywriting for the landing page.' }, { serviceId: 'social', quantity: 1, rationale: 'Five graphics equal one social launch pack.' }],
  assumptions: ['Existing brand assets will be supplied by the client.', 'One revision round per deliverable is included.', 'Hosting, domains and third-party fees are excluded.'], questions: []
};
