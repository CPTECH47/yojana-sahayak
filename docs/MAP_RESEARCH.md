# CSC location research

Current behaviour: the website and bot link to the official CSC locator at https://locator.csccloud.in/ and the [Find My CSC map](https://findmycsc.nic.in/csc/), which is linked from [e-Shram's government FAQ](https://www.beta.eshram.gov.in/faqs). Users search or select their area there. No automatic closest-centre, phone-number or PIN lookup is claimed.

## Open-source options investigated

- [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) displays interactive maps. It is a map renderer; it needs a separate tile provider and does not supply a verified CSC directory.
- [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) can search mapped places. The community database may omit CSCs or contain outdated names, addresses and phone numbers. Public instances have usage limits and may be overloaded. A map match is not proof of official CSC status.
- [Pelias](https://github.com/pelias/pelias) is an open-source place search service, but self-hosting requires data import and Elasticsearch. A hosted provider may have its own terms and prices. It is not an official CSC registry.
- [Nominatim public-service policy](https://operations.osmfoundation.org/policies/nominatim/) restricts automated use, requires an identifying user agent and attribution, and caps usage. It also warns against sending personal data. Do not add generic use of the public endpoint without a deliberate compliant deployment decision.

Before enabling location results, identify an authorised, current CSC directory or API with address, location, contact and usage rights. Confirm whether results are actually nearest, obtain user consent before sending location to any third party, handle unavailable data, and verify the returned details with fictional or consenting test cases. Do not present unverified crowdsourced listings as official government centres.
