/**
 * Snapshot of current destination slugs, used by middleware.ts to decide
 * whether a legacy WordPress /st_location/{region}/{slug}/ URL can 301 to a
 * specific /destinations/{slug} page (or falls back to the listing).
 *
 * Regenerate when destinations are added / renamed:
 *   select slug from destinations order by slug;
 *
 * Edge middleware can't hit Supabase without extra runtime setup, so we bake
 * the set here. The list is stable — destinations change rarely.
 */
export const DESTINATION_SLUGS: ReadonlySet<string> = new Set([
  "altit","altit-fort","arang-kel","astore","attabad-lake","ayun","babusar","badshahi-mosque",
  "baintha","baltit-fort","bamburet","bara-pani","basho-meadows-skardu","batakundi","beyal-camp",
  "biafo-glacier","birir","blind-lake","blue-lake","borith-lake","broghil","buni","buni-zom",
  "burawai","buzi-pass","chaqchan-mosque","chilas","chitha-katha-lake","chitral",
  "chitral-gol-national-park","dak-ii","delhi-gate","deosai","diran-peak","dojanga","eagles-nest",
  "fairy-meadows","fairy-meadows-jeep-trail","fakir-khana-museum","gahkuch","galiyat","ganish",
  "garam-chashma","german-view-point","gharel","ghizer","gilgit","gojal","golaghmuli",
  "golden-beach","golden-sand-beach","gorakh","great-sphinx","great-wall-of-sindh","gupis",
  "gwadar","handrap","hari-parbat","herrligkoffer-base-camp","hingol","hopar","hopar-glacier",
  "hub-dam","hunza","hussaini-bridge","interior-sindh","ishkoman","islamabad","jahaz-banda",
  "kaghan","kala-pani","kalam","kalash","kalash-dur-museum","karachi","karakal","karambar-lake",
  "karimabad","karphoghoro","kashal-agri","katora-lake","katpanah-desert","keenjhar-lake","keran",
  "khalti-lake","khamosh-waterfall","khan-pur-dam","khaplu","khaplu-palace","khunjerab",
  "khunjerab-national-park","kirthar-national-park","koh-e-batil","koyo-zom","kumrat",
  "kumrat-waterfall","kund-banda","kund-malir","lady-finger","lahore","lahore-fort","lalirabat",
  "langar","larkana","lashkargaz","lashkargaz-lake","lulusar","mahudand-lake","makli","makran",
  "malam-jabba","mango","manshi-top","manthoka-waterfall","marphoghoro","masherbrum-view-point",
  "mastuj","miar-peak","minapin","minimarg","mohen-jo-daro","murree","mushkpuri","muzzaffarabad",
  "nagar","naltar","namla","nanga-parbat","nanga-parbat-base-camp","naran","nathigalli",
  "neelam-valley","ormara","pasni","passu","passu-cones","passu-glacier","patriata","peshawar",
  "phandar","phandar-lake","pipeline-track","pishukan","princess-of-hope","qaqlasht",
  "rainbow-lake","rakaposhi","rakaposhi-base-camp","rama-lake","rama-meadows","ranikot-fort",
  "ratti-galli","rumbur","rupal-base-camp","rush-lake","rush-peak","sadpara-lake",
  "saiful-ul-malook","saling","sarfarangah","satrangi-lake","shahi-fort-chitral","shahi-hammam",
  "shahi-mosque-chitral","shahjhan-mosque","shandur","shandur-lake","shandur-pass",
  "shandur-polo-ground","shangrila","sharan","sharda","shausar","sheosar-lake","shigar",
  "shigar-fort","shinghu-lake","shingu-meadows","shogran","shounter","siri-paye","skardu",
  "snow-lake","snow-leopard-view-point","sor-laspur","sosbun-brakk","sost","spantik-peak","swat",
  "taobut","tarashing","tatu","thal","thorsikar-fort","tirich-mir","ultar-sar","upper-chitral",
  "upper-kachura-lake","ushu","wazir-khan-mosque","white-palace","yangal","yarkhun","yasin",
  "zhoe-peak",
]);

/**
 * Best-effort normalization for legacy slugs that don't exactly match:
 *   - Strip trailing "-N" (e.g. "deosai-2" → "deosai")
 *   - Try common typo/hyphen variants (borithlake → borith-lake)
 * Returns the mapped current slug if a match is found, else null.
 */
export function resolveLegacyDestinationSlug(rawSlug: string): string | null {
  const s = rawSlug.toLowerCase();
  if (DESTINATION_SLUGS.has(s)) return s;
  // Strip trailing "-N" WP disambiguator (e.g. "passu-2" → "passu")
  const stripped = s.replace(/-\d+$/, "");
  if (stripped !== s && DESTINATION_SLUGS.has(stripped)) return stripped;
  // Known WP hyphen/typo variants — mapping stale WP slugs to their current
  // successor. Basho alone was leaking 47 clicks / 5,449 impressions to the
  // /destinations listing before this was added.
  const variants: Record<string, string> = {
    "borithlake": "borith-lake",
    "gahukuch": "gahkuch",
    "shinghu-meadows": "shingu-meadows",
    "basho": "basho-meadows-skardu",
    "shandur-national-park": "shandur",
  };
  if (variants[s]) return variants[s];
  return null;
}
