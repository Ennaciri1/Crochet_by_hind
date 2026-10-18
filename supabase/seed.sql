-- =====================================================================
--  Example post: a beginner crochet coaster.
--  Run AFTER schema.sql (SQL Editor → New query → paste → Run).
--  The cover is an illustration stored in the site (/images/coaster-cover.svg).
--  Replace it with your own photo from the admin when you are ready.
-- =====================================================================

insert into public.posts (
  slug, title, excerpt, cover_url, cover_alt, category, tags, content,
  difficulty, yarn, hook, gauge, finished_size, time_estimate, materials,
  abbreviations, pattern, faq, etsy_url, seo_title, seo_description,
  status, published_at
) values (
  'easy-crochet-coaster-free-pattern',
  'Easy Crochet Coaster: A Free Pattern for Total Beginners',
  'A round cotton coaster you can finish in 20 minutes. Four rounds, three stitches, and a tidy border — the perfect first project or last-minute gift.',
  '/images/coaster-cover.svg',
  'A round cream and terracotta crochet coaster with a mug of tea on top, on a wooden table',
  'free-patterns',
  array['coaster', 'beginner', 'cotton yarn', 'quick gift'],
$md$If you have just learned to hold a hook, this coaster is for you. It works up in the round with only **chain, single crochet and double crochet**, so you practice the stitches you will use in almost every other pattern.

Make one in an evening, or a set of four for a housewarming gift.

## Why you will love this coaster

- It is fast: about 20 minutes once you know the stitches.
- It uses scraps: one coaster needs about 15 yards of worsted cotton.
- It is practical: cotton absorbs drips and survives hot mugs.

## Choosing your yarn

Pick a **100% cotton** worsted weight yarn (weight 4). Acrylic can melt under a very hot mug, and wool felts in the wash. Cotton is also easier to see your stitches in, which helps when you are learning.

Light colors make stitches easier to count. Save the dark shades for your second coaster.

## Tips before you start

Count your stitches at the end of every round. The number in parentheses at the end of each round tells you how many stitches you should have.

Use a stitch marker in the first stitch of each round. It saves a lot of frowning at your work.

If your coaster starts to ruffle, your stitches are too loose or you added too many increases. If it cups like a bowl, try a hook one size bigger.

## Finishing and care

Weave in your ends securely, going back and forth in at least three directions. Then wet the coaster, press it flat with your hands and let it dry on a towel. This step, called blocking, makes the circle perfectly round.

Wash on cold, lay flat to dry.
$md$,
  'beginner',
  'Worsted weight (4) cotton, about 15 yd per coaster. Shown in Cream and Terracotta.',
  '5 mm (H-8)',
  'Rounds 1–2 = 2.75 in (7 cm) across',
  '4.25 in (11 cm) diameter',
  '20 minutes',
  array[
    'Worsted weight cotton yarn in 2 colors (about 15 yd total)',
    '5 mm (H-8) crochet hook',
    'Stitch marker',
    'Scissors',
    'Yarn needle'
  ],
$abbr$ch – chain
sl st – slip stitch
sc – single crochet
dc – double crochet
st(s) – stitch(es)
rnd – round
MR – magic ring
FO – fasten off
* … * – repeat the steps between asterisks$abbr$,
$pat$**Notes:** The ch 2 at the start of each round does not count as a stitch. Join every round with a sl st to the first stitch.

**Rnd 1:** With Cream, make a MR. Ch 2, work 12 dc into the ring. Pull the tail to close. Sl st to first dc. *(12 sts)*

**Rnd 2:** Ch 2, 2 dc in each st around. Sl st to first dc. *(24 sts)*

**Rnd 3:** Ch 2, *dc in next st, 2 dc in next st*, repeat from * to * around. Sl st to first dc. *(36 sts)*

**Rnd 4:** Change to Terracotta. Ch 1, *sc in next 2 sts, 2 sc in next st*, repeat from * to * around. Sl st to first sc. *(48 sts)*

**Rnd 5:** Ch 1, sl st loosely in each st around. *(48 sts)* FO.

**Finishing:** Weave in all ends with the yarn needle. Block flat (see above).$pat$,
  '[
    {"q": "Can I use acrylic yarn for a crochet coaster?", "a": "You can, but cotton is better: it absorbs moisture and will not melt under a very hot mug. Acrylic is fine for decorative coasters."},
    {"q": "Why is my coaster wavy?", "a": "A wavy edge means too many stitches for the size of the circle. Check your stitch count after each round, or try a hook one size smaller."},
    {"q": "Why is my coaster curling up like a bowl?", "a": "That means too few stitches or a very tight tension. Make sure you work every increase, or go up one hook size."},
    {"q": "Can I sell coasters made from this pattern?", "a": "Yes! You may sell finished coasters you made yourself. Please credit this site as the designer. Do not share or sell the pattern itself."}
  ]'::jsonb,
  '',
  'Easy Crochet Coaster Free Pattern (Beginner Friendly)',
  'Make a round cotton crochet coaster in 20 minutes with this free beginner pattern. US terms, stitch counts for every round and printable instructions.',
  'published',
  now()
)
on conflict (slug) do nothing;
