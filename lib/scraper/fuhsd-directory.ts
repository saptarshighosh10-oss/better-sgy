// Public staff directory for Cupertino High School (chs.fuhsd.org/about-us/general-information/directory)
// Used to classify @fuhsd.org senders: known staff → 'teacher', unknown → likely student → 'friend'

export interface StaffMember {
  name: string
  email: string
  nameParts: string[] // lowercase first/last name parts for fuzzy matching
}

// Build name parts for fast matching (parts longer than 2 chars)
function entry(name: string, email: string): StaffMember {
  return {
    name,
    email: email.toLowerCase(),
    nameParts: name.toLowerCase().split(/[\s.,\-]+/).filter(p => p.length > 2),
  }
}

export const CHS_STAFF: StaffMember[] = [
  // Administration
  entry('Bill Schloss', 'principal@fuhsd.org'),
  entry('Anna Delgadillo', 'anna_delgadillo@fuhsd.org'),
  entry('David Erwin', 'david_erwin@fuhsd.org'),
  entry('George Bechara', 'george_bechara@fuhsd.org'),
  entry('Steven Puccinelli', 'steven_puccinelli@fuhsd.org'),
  entry('Jackie Corso', 'jackie_corso@fuhsd.org'),
  // Administration Support
  entry('Christina Orozco', 'christina_orozco@fuhsd.org'),
  entry('Cheryl Hassett', 'cheryl_hassett@fuhsd.org'),
  entry('Cecilia Arroyo', 'cecilia_arroyo@fuhsd.org'),
  entry('Paris Kent', 'paris_kent@fuhsd.org'),
  entry('Jennifer Jacobs', 'jennifer_jacobs@fuhsd.org'),
  entry('Lisa Moore', 'lisa_moore@fuhsd.org'),
  entry('Marcela Davis', 'marcela_davis@fuhsd.org'),
  entry('Nicole Conroy', 'nicole_conroy@fuhsd.org'),
  entry('Rosalba Hernandez', 'rosalba_hernandez@fuhsd.org'),
  entry('Pete Hernandez', 'pete_hernandez@fuhsd.org'),
  entry('Katrina Rojko', 'katrina_rojko@fuhsd.org'),
  entry('Kamila Drapal', 'kamila_drapal@fuhsd.org'),
  entry('Cori Walker', 'cori_walker@fuhsd.org'),
  entry('Ajay Kurani', 'ajay_kurani@fuhsd.org'),
  // Guidance
  entry('Gregg Buie', 'gregg_buie@fuhsd.org'),
  entry('Anna Jackson', 'anna_jackson@fuhsd.org'),
  entry('Tamara Emmert', 'tamara_emmert@fuhsd.org'),
  entry('Lillie Phares', 'lillie_phares@fuhsd.org'),
  entry('Wendy Amick', 'wendy_amick@fuhsd.org'),
  // Mental Health
  entry('Elizabeth Brandt', 'elizabeth_brandt@fuhsd.org'),
  entry('Cathy Gomez', 'cathy_gomez@fuhsd.org'),
  entry('Christopher Hickey', 'christopher_hickey@fuhsd.org'),
  entry('Kristopher Hughes', 'kristopher_hughes@fuhsd.org'),
  entry('Denise Salin', 'denise_salin@fuhsd.org'),
  entry('Bailey Wright', 'bailey_wright@fuhsd.org'),
  // World Language Teachers
  entry('Imene Aggoun', 'imene_aggoun@fuhsd.org'),
  entry('Liza Aguilar', 'liza_aguilar@fuhsd.org'),
  entry('Jie Bai', 'jie_bai@fuhsd.org'),
  entry('Stefanie Fan', 'stefanie_fan@fuhsd.org'),
  entry('Dulce Hernandez Salazar', 'dulce_hernandez_salazar@fuhsd.org'),
  entry('Stacey Jacob', 'stacey_jacob@fuhsd.org'),
  entry('Ying Jin', 'ying_jin@fuhsd.org'),
  entry('Laurie Lucatero', 'laurie_lucatero@fuhsd.org'),
  entry('Carlos Martinez', 'carlos_martinez@fuhsd.org'),
  entry('Jessica Schaetzke', 'jessica_schaetzke@fuhsd.org'),
  // English Teachers
  entry('Lynn Chen', 'lynn_chen@fuhsd.org'),
  entry('Teresa Filice', 'teresa_filice@fuhsd.org'),
  entry('Alex Han', 'alex_han@fuhsd.org'),
  entry('Olga Hazeghi', 'olga_hazeghi@fuhsd.org'),
  entry('Ashley Hooper', 'ashley_hooper@fuhsd.org'),
  entry('Zach Jacobs', 'zach_jacobs@fuhsd.org'),
  entry('Kelleen Loo', 'kelleen_loo@fuhsd.org'),
  entry('Christina Masuda', 'christina_masuda@fuhsd.org'),
  entry('Greg Merrick', 'greg_merrick@fuhsd.org'),
  entry('Nikki Merrick', 'nikki_merrick@fuhsd.org'),
  entry('Kevin Morgan', 'kevin_morgan@fuhsd.org'),
  entry('Jenny Padgett', 'jenny_padgett@fuhsd.org'),
  entry('Amanda Phelps-McQuaide', 'amanda_phelps-mcquaide@fuhsd.org'),
  entry('Jenna Ray', 'jenna_ray@fuhsd.org'),
  entry('Ann Shriver-Peck', 'ann_shriver-peck@fuhsd.org'),
  entry('Elaina Smith', 'elaina_smith@fuhsd.org'),
  entry('Allison Vernon', 'allison_vernon@fuhsd.org'),
  // Math Teachers
  entry('Amy Benson', 'amy_benson@fuhsd.org'),
  entry('Alvin Choe', 'alvin_choe@fuhsd.org'),
  entry('Stella Demetriou', 'stella_demetriou@fuhsd.org'),
  entry('Stacey Jaehnig', 'stacey_jaehnig@fuhsd.org'),
  entry('Le-Quyen Lou', 'le-quyen_lou@fuhsd.org'),
  entry('Stacey Morse', 'stacey_morse@fuhsd.org'),
  entry('Jeremiah Rebustes', 'jeremiah_rebustes@fuhsd.org'),
  entry('Alexander Shieh', 'alexander_shieh@fuhsd.org'),
  entry('Ashley Stubbs', 'ashley_stubbs@fuhsd.org'),
  entry('April Williams', 'april_williams@fuhsd.org'),
  entry('Hyungi Woo', 'hyungi_woo@fuhsd.org'),
  // Science Teachers
  entry('Precious Bagamaspad', 'precious_bagamaspad@fuhsd.org'),
  entry('David Chen', 'david_chen@fuhsd.org'),
  entry('Bruce Cheung', 'bruce_cheung@fuhsd.org'),
  entry('Kristi Kuehn', 'kristi_kuehn@fuhsd.org'),
  entry('Kenji Mitchell', 'kenji_mitchell@fuhsd.org'),
  entry('Kent Paris', 'kent_paris@fuhsd.org'),
  entry('Amy Plat', 'amy_plat@fuhsd.org'),
  entry('Daniel Stavis', 'daniel_stavis@fuhsd.org'),
  entry('Hugo Steemers', 'hugo_steemers@fuhsd.org'),
  // Social Studies Teachers
  entry('Sean Coleman', 'sean_coleman@fuhsd.org'),
  entry('Kyle Fitzpatrick', 'kyle_fitzpatrick@fuhsd.org'),
  entry('Jennifer Lowe-Weiler', 'jennifer_lowe-weiler@fuhsd.org'),
  entry('Kimberlee Morgan', 'kimberlee_morgan@fuhsd.org'),
  entry('Jessica Nguyen', 'jessica_nguyen@fuhsd.org'),
  entry('April Northrup', 'april_northrup@fuhsd.org'),
  entry('Colin Phares', 'colin_phares@fuhsd.org'),
  entry('Maritza Santa Cruz', 'maritza_santa_cruz@fuhsd.org'),
  entry('Wes Morse', 'wes_morse@fuhsd.org'),
  entry('Oliver Yeh', 'oliver_yeh@fuhsd.org'),
  // Special Education
  entry('Heather Amirault', 'heather_amirault@fuhsd.org'),
  entry('Brian Bowyer', 'brian_bowyer@fuhsd.org'),
  entry('Sean Cryan', 'sean_cryan@fuhsd.org'),
  entry('Angelica De Koning', 'angelica_de_koning@fuhsd.org'),
  entry('Darlene Lee', 'darlene_lee@fuhsd.org'),
  entry('Alex Koukoutsakis', 'alex_koukoutsakis@fuhsd.org'),
  entry('Ashley Ornelas', 'ashley_ornelas@fuhsd.org'),
  entry('Meredith Reeve', 'meredith_reeve@fuhsd.org'),
  entry('Laura Ryner', 'laura_ryner@fuhsd.org'),
  entry('Rachel Shahrivar', 'rachel_shahrivar@fuhsd.org'),
  entry('Leslie Soto', 'leslie_soto@fuhsd.org'),
  // Music & Performing Arts
  entry('Andrew Aron', 'andrew_aron@fuhsd.org'),
  entry('Ben Scharf', 'ben_scharf@fuhsd.org'),
  entry('Gilbert Iruegas', 'gilbert_iruegas@fuhsd.org'),
  entry('Arcadia Conrad', 'arcadia_conrad@fuhsd.org'),
  // PE & Athletics
  entry('Jill Borges', 'jill_borges@fuhsd.org'),
  entry('Craig Ellegood', 'craig_ellegood@fuhsd.org'),
  entry('James Gilmore', 'james_gilmore@fuhsd.org'),
  entry('Chris Oswald', 'chris_oswald@fuhsd.org'),
  // Art
  entry('Carley Stavis', 'carley_stavis@fuhsd.org'),
  entry('Amber Steele', 'amber_steele@fuhsd.org'),
  entry('Jo Vadeboncoeur', 'jo_vadeboncoeur@fuhsd.org'),
  // Other Certificated Staff
  entry('Sean Bui', 'sean_bui@fuhsd.org'),
  entry('Aiden Hill', 'aiden_hill@fuhsd.org'),
  entry('Christopher Skrocke', 'christopher_skrocke@fuhsd.org'),
  entry('Eric Ferrante', 'eric_ferrante@fuhsd.org'),
  entry('Ted McLeod', 'ted_mcleod@fuhsd.org'),
  entry('Charity Joy', 'charity_joy@fuhsd.org'),
  entry('Kristi Iwami', 'kristi_iwami@fuhsd.org'),
  entry('Zakia Lamb', 'zakia_lamb@fuhsd.org'),
  entry('Ivanna Warren', 'ivanna_warren@fuhsd.org'),
  // Teaching Support
  entry('Enrique Baeza', 'enrique_baeza@fuhsd.org'),
  entry('Nancy Boyle', 'nancy_boyle@fuhsd.org'),
  entry('Corina Bustamante', 'corina_bustamante@fuhsd.org'),
  entry('Tung Ching Chien', 'tung_ching_chien@fuhsd.org'),
  entry('Peter Ciotta', 'peter_ciotta@fuhsd.org'),
  entry('Lindy Flores', 'lindy_flores@fuhsd.org'),
  entry('Melissa Goins', 'melissa_goins@fuhsd.org'),
  entry('Alycia Harlow', 'alycia_harlow@fuhsd.org'),
  entry('Eric Holderman', 'eric_holderman@fuhsd.org'),
  entry('Betty T. Lee', 'betty_t_lee@fuhsd.org'),
  entry('Milo Lewis', 'milo_lewis@fuhsd.org'),
  entry('Allyson Matsuoka', 'allyson_matsuoka@fuhsd.org'),
  entry('Sarah Medida', 'sarah_medida@fuhsd.org'),
  entry('Kenny Pope', 'kenny_pope@fuhsd.org'),
  entry('Emma Seyer', 'emma_seyer@fuhsd.org'),
  entry('Namrata Shah', 'namrata_shah@fuhsd.org'),
  entry('Peter Tseng', 'peter_tseng@fuhsd.org'),
  entry('Yuri Ujifusa', 'yuri_ujifusa@fuhsd.org'),
  entry('Marilyn Wong', 'marilyn_wong@fuhsd.org'),
  entry('Manuel Zarate', 'manuel_zarate@fuhsd.org'),
  // Technology Support
  entry('Patrick Hanson', 'patrick_hanson@fuhsd.org'),
  entry('Kyle Le', 'kyle_le@fuhsd.org'),
  entry('Julia Hedstrom', 'julia_hedstrom@fuhsd.org'),
]

// Fast O(1) lookup by email
const STAFF_EMAIL_SET = new Set(CHS_STAFF.map(s => s.email))

// Returns true if this email address belongs to a known CHS staff member
export function isKnownStaff(email: string): boolean {
  return STAFF_EMAIL_SET.has(email.toLowerCase())
}

// Returns true if sender name matches any known staff member's name parts
export function nameMatchesStaff(senderName: string): boolean {
  const lower = senderName.toLowerCase()
  return CHS_STAFF.some(s => s.nameParts.some(p => lower.includes(p) && p.length > 3))
}
