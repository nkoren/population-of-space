<script lang="ts">
  import type { Dataset } from '$lib/data/types';
  import { fmtDate, fmtInt } from '$lib/format';
  let { ds }: { ds: Dataset } = $props();
</script>

<div class="container page">
  <h1>About</h1>
  <div class="prose">
    <p>
      <strong>The Population of Space</strong> is a long-running personal project to track and visualise the human presence beyond Earth. It began as a spreadsheet; this site is the same idea made explorable. The aim is to help people think about space in a more holistic way: not as a series of headline missions, but as a small, persistent, slowly changing population.
    </p>

    <h2>What is counted</h2>
    <p>
      Every crewed spaceflight since Vostok 1, and every person who has been aboard one. A person is “in space” from the launch of the vehicle that carried them up to the landing of the vehicle that brought them down, which may be a different one (crew rotations on Salyut, Mir, the ISS and Tiangong). Space begins at the 100 km Kármán line: suborbital flights that crossed it (New Shepard, SpaceShipOne, two X-15 flights) are included and can be toggled off in the explorer; flights that peaked below it, such as Virgin Galactic’s, are not counted.
    </p>
    <p>
      The dataset currently holds <strong>{fmtInt(ds.flights.length)} flights</strong> and <strong>{fmtInt(ds.people.length)} people</strong>, and is complete through <strong>{fmtDate(new Date(ds.dataEnd))}</strong>.
    </p>

    <h2>How the numbers are computed</h2>
    <ul>
      <li><strong>Population of space</strong> at yearly or monthly resolution is the average headcount over that period: total person-days divided by the days in the period. At “every event” resolution it is the exact count after each launch and landing.</li>
      <li><strong>Person-days</strong> are days of human presence accumulated in the period, so a six-person crew for 30 days is 180 person-days.</li>
      <li><strong>Breakdowns</strong> attribute each stay to a single category: a person’s primary nationality, their sex as recorded, their age at the start of the stay, and the destination, launch nation and sector of the flight that took them up.</li>
      <li><strong>Nationality</strong> follows the dataset’s assignments. Soviet-era cosmonauts are attributed to modern successor states (Russia, Ukraine, Kazakhstan…). People with multiple citizenships are counted under the first one listed.</li>
    </ul>

    <h2>Caveats</h2>
    <ul>
      <li>Birth dates are missing for some commercial suborbital passengers, so they appear as “unknown age”.</li>
      <li>Launch and landing times are in UTC and are only as precise as the sources; a few early flights are recorded to the minute rather than the second.</li>
      <li>Destination is a property of the flight, not the moment: an Apollo lunar crew is “Moon” from launch to splashdown.</li>
    </ul>

    <h2>Extending the data</h2>
    <p>
      The source data lives as plain YAML files in the project repository: one file of people, one file of flights per year, and small lookup tables for nations and destinations. Adding a mission means appending a record, adding any new people, and running the validator, which simulates the whole timeline and refuses anything inconsistent (someone launching while already in space, a landing without a launch, an unknown person). That makes it a task an AI assistant can do reliably from a Wikipedia page. See <code>docs/DATA.md</code> in the repository for the schema and the step-by-step recipe.
    </p>

    <h2>Sources</h2>
    <p>Flight and crew data are compiled primarily from Wikipedia mission articles, which are linked from the Missions and People pages.</p>
    <p>
      Photographs are from the NASA Image and Video Library (public domain) and the China Manned Space Engineering Office via Wikimedia Commons (CC BY 4.0). Each image is credited where it appears.
    </p>
  </div>
</div>

<style>
  .page {
    padding-top: 40px;
  }
  .prose {
    max-width: 720px;
  }
  .prose h2 {
    font-size: 1.3rem;
    margin-top: 1.6em;
  }
  .prose li {
    margin-bottom: 0.5em;
  }
</style>
