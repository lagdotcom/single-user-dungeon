export const MobTags = ["player", "builder"] as const;

type MobTag = (typeof MobTags)[number];
export default MobTag;
