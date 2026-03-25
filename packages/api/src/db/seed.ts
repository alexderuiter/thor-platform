import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users with different roles
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "jan.devries@amsterdam.nl" },
      update: {},
      create: {
        email: "jan.devries@amsterdam.nl",
        naam: "Jan de Vries",
        role: "BOA",
        badgeNr: "BOA-2024-001",
      },
    }),
    prisma.user.upsert({
      where: { email: "maria.jansen@amsterdam.nl" },
      update: {},
      create: {
        email: "maria.jansen@amsterdam.nl",
        naam: "Maria Jansen",
        role: "TOEZICHTHOUDER",
        badgeNr: "TH-2024-042",
      },
    }),
    prisma.user.upsert({
      where: { email: "ahmed.hassan@amsterdam.nl" },
      update: {},
      create: {
        email: "ahmed.hassan@amsterdam.nl",
        naam: "Ahmed Hassan",
        role: "KWC",
      },
    }),
    prisma.user.upsert({
      where: { email: "lisa.bakker@amsterdam.nl" },
      update: {},
      create: {
        email: "lisa.bakker@amsterdam.nl",
        naam: "Lisa Bakker",
        role: "AANVOERDER",
      },
    }),
    prisma.user.upsert({
      where: { email: "peter.smit@amsterdam.nl" },
      update: {},
      create: {
        email: "peter.smit@amsterdam.nl",
        naam: "Peter Smit",
        role: "JURIST",
      },
    }),
    prisma.user.upsert({
      where: { email: "sara.berg@amsterdam.nl" },
      update: {},
      create: {
        email: "sara.berg@amsterdam.nl",
        naam: "Sara van den Berg",
        role: "BEHEERDER",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create some feitcodes
  const feitcodes = await Promise.all([
    prisma.feitcode.upsert({
      where: { code: "R315b" },
      update: {},
      create: {
        code: "R315b",
        omschrijving: "Wildplassen",
        categorie: "Overlast",
        thema: "OVERLAST_PERSONEN",
        wettekst: "APV Amsterdam art. 4.9",
        boeteBedrag: 140,
      },
    }),
    prisma.feitcode.upsert({
      where: { code: "F001" },
      update: {},
      create: {
        code: "F001",
        omschrijving: "Afval bijplaatsen bij container",
        categorie: "Afval",
        thema: "AFVAL_MILIEU",
        wettekst: "Afvalstoffenverordening art. 14",
        boeteBedrag: 195,
      },
    }),
    prisma.feitcode.upsert({
      where: { code: "V001" },
      update: {},
      create: {
        code: "V001",
        omschrijving: "Fout parkeren",
        categorie: "Verkeer",
        thema: "VERKEER",
        wettekst: "RVV 1990 art. 24",
        boeteBedrag: 100,
      },
    }),
    prisma.feitcode.upsert({
      where: { code: "N001" },
      update: {},
      create: {
        code: "N001",
        omschrijving: "Afmeren op verboden locatie",
        categorie: "Nautisch",
        thema: "WATER_NAUTISCH",
        wettekst: "Binnenhavengeldverordening art. 12",
        boeteBedrag: 250,
      },
    }),
    prisma.feitcode.upsert({
      where: { code: "S001" },
      update: {},
      create: {
        code: "S001",
        omschrijving: "Mishandeling",
        categorie: "Geweld",
        thema: "OVERLAST_PERSONEN",
        wettekst: "Wetboek van Strafrecht art. 300",
      },
    }),
  ]);

  console.log(`Created ${feitcodes.length} feitcodes`);

  // Create sample werkopdracht
  const werkopdracht = await prisma.werkopdracht.create({
    data: {
      titel: "Controle afval bijplaatsingen Oost",
      omschrijving: "Hotspot controle rondom afvalcontainers in stadsdeel Oost",
      thema: "AFVAL_MILIEU",
      startDatum: new Date(),
      eindDatum: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`Created werkopdracht: ${werkopdracht.titel}`);

  // Create sample AVG zaak (bestuursrechtelijk)
  const locatie1 = await prisma.locatie.create({
    data: {
      straatnaam: "Middenweg",
      huisnummer: "47",
      postcode: "1098AA",
      woonplaats: "Amsterdam",
      latitude: 52.3508,
      longitude: 4.9261,
    },
  });

  const avgZaak = await prisma.avgZaak.create({
    data: {
      registratieType: "BESTUURLIJKE_BOETE",
      status: "WACHT_OP_KWALITEITSCONTROLE",
      thema: "AFVAL_MILIEU",
      omschrijving: "Afval bijgeplaatst naast container Middenweg",
      locatieId: locatie1.id,
      medewerkerId: users[0].id,
      feitcodeId: feitcodes[1].id,
      werkopdrachtId: werkopdracht.id,
      betrokkenen: {
        create: [{
          rol: "OVERTREDER",
          voornaam: "Test",
          achternaam: "Persoon",
        }],
      },
    },
  });

  // Create KWC workflow task for the zaak
  await prisma.workflowTaak.create({
    data: {
      zaakId: avgZaak.id,
      zaakType: "AVG",
      type: "KWALITEITSCONTROLE",
      titel: `Kwaliteitscontrole BBOOR ${avgZaak.zaakNummer.slice(0, 8)}`,
      status: "OPEN",
    },
  });

  console.log(`Created sample AVG zaak: ${avgZaak.zaakNummer}`);

  // Create sample WPG zaak (strafrechtelijk)
  const locatie2 = await prisma.locatie.create({
    data: {
      straatnaam: "Damrak",
      huisnummer: "1",
      postcode: "1012LG",
      woonplaats: "Amsterdam",
      latitude: 52.3738,
      longitude: 4.8952,
    },
  });

  const wpgZaak = await prisma.wpgZaak.create({
    data: {
      registratieType: "COMBIBON",
      wpgArtikel: "ART_8",
      status: "OPEN",
      thema: "VERKEER",
      omschrijving: "Fout geparkeerd voertuig Damrak",
      locatieId: locatie2.id,
      medewerkerId: users[0].id,
      feitcodeId: feitcodes[2].id,
      cautieGegeven: true,
      betrokkenen: {
        create: [{
          rol: "VERDACHTE",
          kenteken: "AB-123-CD",
        }],
      },
    },
  });

  console.log(`Created sample WPG zaak: ${wpgZaak.zaakNummer}`);

  console.log("Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
