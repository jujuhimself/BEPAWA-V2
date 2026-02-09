/* Additional treatment guidelines extracted from user-provided markdown */
import { TreatmentGuideline } from './treatmentGuidelines';

const extraGuidelines: TreatmentGuideline[] = [
  {
    id: 'altered-mental-01',
    condition: 'Altered Mental Status',
    symptoms: ['Confusion', 'Unconscious', 'Disorientation'],
    firstLine: [
      { medication: 'Thiamine', dosage: '100 mg IV', duration: 'single', notes: 'Give before glucose if alcohol abuse suspected' },
      { medication: 'Dextrose 50%', dosage: '50 ml IV', duration: 'single', notes: 'Treat hypoglycemia if present' }
    ],
    precautions: ['Avoid sedation before stabilization'],
    whenToRefer: ['Focal deficits', 'Persistent altered state'],
    patientCounseling: ['Seek urgent evaluation for persistent confusion']
  },
  {
    id: 'pulm-edema-01',
    condition: 'Pulmonary Edema',
    symptoms: ['Dyspnea', 'Orthopnea', 'Crackles'],
    firstLine: [
      { medication: 'Furosemide', dosage: '20–40 mg IV', duration: 'single', notes: 'May repeat as needed' },
      { medication: 'Morphine', dosage: '2–5 mg IV', duration: 'slow push', notes: 'Use cautiously' }
    ],
    precautions: ['Monitor respiratory status, BP'],
    whenToRefer: ['Refractory hypoxia', 'Cardiogenic shock'],
    patientCounseling: ['Limit salt', 'Adhere to HF meds']
  },
  {
    id: 'sepsis-01',
    condition: 'Sepsis / Septic Shock',
    symptoms: ['Fever', 'Hypotension', 'Tachycardia'],
    firstLine: [
      { medication: 'Ceftriaxone', dosage: '1–2 g IV', duration: 'BID', notes: 'Adjust per antibiogram' },
      { medication: 'Crystalloids', dosage: '30 ml/kg IV bolus', duration: 'single', notes: 'Fluid resuscitation' }
    ],
    precautions: ['Monitor lactate', 'Avoid delay in antibiotics'],
    whenToRefer: ['Persistent hypotension', 'Multi-organ failure'],
    patientCounseling: ['Early presentation improves outcomes']
  },
  {
    id: 'fever-01',
    condition: 'Fever (Pyrexia)',
    symptoms: ['Fever', 'Chills', 'Sweats'],
    firstLine: [
      { medication: 'Paracetamol', dosage: '15 mg/kg', duration: 'every 6 h', notes: 'Max 60 mg/kg/day' }
    ],
    precautions: ['Avoid NSAIDs in GI/renal risk'],
    whenToRefer: ['>39°C >3 days', 'Severe systemic signs'],
    patientCounseling: ['Hydrate', 'Seek care if worsening']
  },
  {
    id: 'cholera-01',
    condition: 'Cholera',
    symptoms: ['Profuse watery diarrhea', 'Dehydration'],
    firstLine: [
      { medication: 'Oral Rehydration Solution', dosage: 'As needed', duration: 'ongoing', notes: 'Primary therapy' },
      { medication: 'Ringer\'s Lactate', dosage: 'As per WHO plan', duration: 'IV', notes: 'Moderate/severe dehydration' },
      { medication: 'Doxycycline', dosage: '300 mg PO once', duration: 'single', notes: 'Adults' }
    ],
    precautions: ['Tetracycline contraindicated in <8 yrs & pregnancy'],
    whenToRefer: ['Severe dehydration', 'Pregnancy'],
    patientCounseling: ['Safe water', 'Hand hygiene']
  },
  {
    id: 'dvt-01',
    condition: 'Deep Vein Thrombosis (DVT)',
    symptoms: ['Leg swelling', 'Pain', 'Redness'],
    firstLine: [
      { medication: 'Enoxaparin', dosage: '1 mg/kg SC', duration: 'q12h', notes: 'LMWH' }
    ],
    secondLine: [
      { medication: 'Warfarin', dosage: '5 mg PO', duration: 'daily', notes: 'Adjust to INR 2–3' }
    ],
    precautions: ['Active bleeding', 'Recent surgery'],
    whenToRefer: ['Massive DVT', 'Phlegmasia'],
    patientCounseling: ['Adherence to anticoagulation', 'INR monitoring']
  },
  {
    id: 'typhoid-01',
    condition: 'Typhoid Fever',
    symptoms: ['Fever', 'Abdominal pain', 'Constipation'],
    firstLine: [
      { medication: 'Ciprofloxacin', dosage: '500 mg PO', duration: 'BID 7–14 days' }
    ],
    secondLine: [
      { medication: 'Ceftriaxone', dosage: '2 g IV/IM', duration: 'daily 10–14 days' }
    ],
    precautions: ['Fluoroquinolone caution in children/pregnancy'],
    whenToRefer: ['Complications', 'Treatment failure'],
    patientCounseling: ['Safe food & water', 'Complete course']
  },
  {
    id: 'hiv-01',
    condition: 'HIV/AIDS (Adults)',
    symptoms: ['Weight loss', 'Opportunistic infections'],
    firstLine: [
      { medication: 'TDF/3TC/DTG', dosage: 'Fixed-dose tab', duration: 'daily', notes: 'First-line' }
    ],
    precautions: ['Baseline creatinine', 'Avoid DTG 1st trimester'],
    whenToRefer: ['Treatment failure', 'Severe ADRs'],
    patientCounseling: ['Adherence critical', 'Regular viral load']
  },
  {
    id: 'pneumonia-01',
    condition: 'Pneumonia (Community-Acquired – Adults)',
    symptoms: ['Cough', 'Fever', 'Dyspnea'],
    firstLine: [
      { medication: 'Amoxicillin', dosage: '500–1000 mg PO', duration: 'q8h 5–7 days' }
    ],
    secondLine: [
      { medication: 'Benzylpenicillin', dosage: '2 MU IV', duration: 'q6h', notes: 'Severe cases' }
    ],
    precautions: ['Penicillin allergy'],
    whenToRefer: ['Respiratory failure', 'Severe CAP score'],
    patientCounseling: ['Complete antibiotics', 'Hydration']
  },
  // ---- New conditions below ----
  {
    id: 'uti-01',
    condition: 'Uncomplicated Urinary Tract Infection (UTI)',
    symptoms: ['Dysuria', 'Frequency', 'Urgency', 'Suprapubic pain'],
    firstLine: [
      { medication: 'Nitrofurantoin', dosage: '100 mg PO', duration: 'BID 5 days', notes: 'Avoid in G6PD deficiency, eGFR <45' },
      { medication: 'Trimethoprim/Sulfamethoxazole', dosage: '160/800 mg PO', duration: 'BID 3 days', notes: 'If local resistance <20%' }
    ],
    secondLine: [
      { medication: 'Ciprofloxacin', dosage: '250 mg PO', duration: 'BID 3 days', notes: 'Reserve for resistant cases' }
    ],
    precautions: ['Increase fluid intake', 'Urinate after intercourse', 'Avoid spermicides'],
    whenToRefer: ['Pregnancy', 'Male patients', 'Symptoms >7 days', 'Recurrent UTIs (≥3/year)'],
    patientCounseling: ['Complete full course of antibiotics', 'Expect symptom improvement in 1–2 days', 'Return if symptoms worsen or persist']
  },
  {
    id: 'urti-01',
    condition: 'Upper Respiratory Tract Infection (URTI)',
    symptoms: ['Cough', 'Sore throat', 'Rhinorrhea', 'Nasal congestion', 'Fever', 'Sneezing'],
    firstLine: [
      { medication: 'Paracetamol', dosage: '500–1000 mg PO', duration: 'q6h PRN', notes: 'Symptomatic; most cases are viral' }
    ],
    precautions: ['Adequate hydration', 'Rest', 'Hand hygiene', 'Cover mouth when coughing'],
    whenToRefer: ['Symptoms >10 days', 'Severe symptoms', 'Difficulty breathing', 'Persistent fever >3 days'],
    patientCounseling: ['Antibiotics are not effective for viral infections', 'Use paracetamol for fever/pain', 'Saline nasal drops for congestion']
  },
  {
    id: 'measles-01',
    condition: 'Measles',
    symptoms: ['Fever', 'Maculopapular rash', 'Koplik spots', 'Conjunctivitis', 'Coryza', 'Cough'],
    firstLine: [
      { medication: 'Vitamin A', dosage: '200,000 IU PO (children >12 mo)', duration: '2 doses 24 h apart', notes: 'Reduces mortality. <6 mo: 50,000 IU; 6–11 mo: 100,000 IU' },
      { medication: 'Paracetamol', dosage: '10–15 mg/kg PO', duration: 'q6h PRN', notes: 'For fever' }
    ],
    precautions: ['Isolate patient', 'Notify public health', 'Supportive care (hydration, nutrition)'],
    whenToRefer: ['Pneumonia', 'Encephalitis', 'Severe malnutrition', 'Immunocompromised', 'Age <6 months'],
    patientCounseling: ['Measles is highly contagious – isolate for 4 days after rash onset', 'Ensure vaccination of contacts', 'Seek care if breathing difficulty or persistent fever']
  },
  {
    id: 'hypertension-01',
    condition: 'Hypertension (Essential)',
    symptoms: ['Elevated blood pressure', 'Headache', 'Dizziness', 'Visual changes'],
    firstLine: [
      { medication: 'Amlodipine', dosage: '5–10 mg PO', duration: 'daily', notes: 'CCB – preferred in Black patients' },
      { medication: 'Enalapril', dosage: '5–20 mg PO', duration: 'daily', notes: 'ACE inhibitor' }
    ],
    secondLine: [
      { medication: 'Hydrochlorothiazide', dosage: '12.5–25 mg PO', duration: 'daily', notes: 'Thiazide diuretic' },
      { medication: 'Losartan', dosage: '50–100 mg PO', duration: 'daily', notes: 'ARB – if ACE-intolerant' }
    ],
    precautions: ['Monitor renal function with ACEi/ARB', 'Avoid ACEi in pregnancy', 'Check electrolytes with diuretics'],
    whenToRefer: ['BP >180/120 (hypertensive crisis)', 'Resistant hypertension (≥3 drugs)', 'End-organ damage'],
    patientCounseling: ['Lifestyle: reduce salt, exercise, limit alcohol', 'Take medications daily even if asymptomatic', 'Regular BP monitoring']
  },
  {
    id: 'diabetes-type2-01',
    condition: 'Diabetes Mellitus Type 2',
    symptoms: ['Polyuria', 'Polydipsia', 'Weight loss', 'Fatigue', 'Blurred vision'],
    firstLine: [
      { medication: 'Metformin', dosage: '500 mg PO', duration: 'BID, titrate to 1000 mg BID', notes: 'First-line; take with meals' }
    ],
    secondLine: [
      { medication: 'Glibenclamide', dosage: '2.5–5 mg PO', duration: 'daily', notes: 'Sulfonylurea – risk of hypoglycemia' },
      { medication: 'Insulin (NPH)', dosage: '10 IU SC', duration: 'bedtime, titrate', notes: 'When oral agents fail' }
    ],
    precautions: ['Monitor HbA1c every 3 months', 'Renal function check with metformin', 'Foot care education'],
    whenToRefer: ['HbA1c >9% despite max oral therapy', 'DKA or HHS', 'Diabetic foot ulcer', 'Retinopathy'],
    patientCounseling: ['Diet modification', 'Regular exercise', 'Self-monitoring of blood glucose', 'Carry sugar for hypoglycemia episodes']
  },
  {
    id: 'asthma-01',
    condition: 'Asthma (Acute & Chronic)',
    symptoms: ['Wheezing', 'Dyspnea', 'Chest tightness', 'Cough', 'Nocturnal cough'],
    firstLine: [
      { medication: 'Salbutamol MDI', dosage: '2–4 puffs', duration: 'q4–6h PRN', notes: 'SABA reliever via spacer' },
      { medication: 'Beclomethasone MDI', dosage: '100–200 mcg', duration: 'BID', notes: 'ICS controller – for persistent asthma' }
    ],
    secondLine: [
      { medication: 'Prednisolone', dosage: '1–2 mg/kg PO', duration: '3–5 days', notes: 'For acute exacerbations' },
      { medication: 'Ipratropium bromide', dosage: '2–4 puffs', duration: 'q6h', notes: 'Add in severe attacks' }
    ],
    precautions: ['Use spacer with MDI', 'Rinse mouth after ICS', 'Avoid triggers'],
    whenToRefer: ['Life-threatening attack', 'Poor control despite Step 3 therapy', 'Diagnostic uncertainty'],
    patientCounseling: ['Always carry reliever inhaler', 'Controller daily even when well', 'Written asthma action plan']
  },
  {
    id: 'hypothermia-01',
    condition: 'Hypothermia',
    symptoms: ['Low body temperature', 'Shivering', 'Confusion', 'Bradycardia', 'Cold skin'],
    firstLine: [
      { medication: 'Warm IV fluids (Normal Saline)', dosage: '40–42°C', duration: 'continuous', notes: 'Active core rewarming' },
      { medication: 'Warm blankets / Bair Hugger', dosage: 'External rewarming', duration: 'continuous', notes: 'Passive & active external rewarming' }
    ],
    precautions: ['Avoid rough handling (risk of arrhythmia)', 'Monitor cardiac rhythm', 'Handle gently – "not dead until warm and dead"'],
    whenToRefer: ['Core temp <32°C', 'Cardiac arrest', 'Refractory hypothermia'],
    patientCounseling: ['Prevention: adequate clothing, shelter', 'Seek medical help early in cold exposure']
  },
  {
    id: 'diarrhea-01',
    condition: 'Acute Diarrhea (Adults)',
    symptoms: ['Loose stools', 'Abdominal cramps', 'Nausea', 'Dehydration'],
    firstLine: [
      { medication: 'ORS (Oral Rehydration Salts)', dosage: 'As per WHO guidelines', duration: 'ongoing', notes: 'Primary therapy' },
      { medication: 'Zinc', dosage: '20 mg PO', duration: 'daily for 10–14 days', notes: 'Children: reduces duration' }
    ],
    secondLine: [
      { medication: 'Ciprofloxacin', dosage: '500 mg PO', duration: 'BID 3 days', notes: 'Only if bacterial dysentery suspected' }
    ],
    precautions: ['Avoid anti-motility agents in bloody diarrhea', 'Continue feeding'],
    whenToRefer: ['Severe dehydration', 'Bloody stools with fever', 'No improvement in 48 h'],
    patientCounseling: ['Drink plenty of fluids', 'Hand hygiene', 'Safe food preparation']
  },
  {
    id: 'peptic-ulcer-01',
    condition: 'Peptic Ulcer Disease (PUD)',
    symptoms: ['Epigastric pain', 'Burning sensation', 'Nausea', 'Bloating', 'Early satiety'],
    firstLine: [
      { medication: 'Omeprazole', dosage: '20 mg PO', duration: 'BID 4–8 weeks', notes: 'PPI' },
      { medication: 'Amoxicillin', dosage: '1 g PO', duration: 'BID 14 days', notes: 'H. pylori triple therapy' },
      { medication: 'Clarithromycin', dosage: '500 mg PO', duration: 'BID 14 days', notes: 'H. pylori triple therapy' }
    ],
    precautions: ['Stop NSAIDs', 'Avoid alcohol and smoking'],
    whenToRefer: ['GI bleeding', 'Perforation', 'Treatment failure', 'Weight loss (exclude malignancy)'],
    patientCounseling: ['Complete H. pylori eradication course', 'Avoid NSAIDs', 'Follow up for test of cure']
  },
  {
    id: 'tb-01',
    condition: 'Tuberculosis (Pulmonary TB)',
    symptoms: ['Chronic cough >2 weeks', 'Night sweats', 'Weight loss', 'Hemoptysis', 'Fever'],
    firstLine: [
      { medication: 'RHZE (Rifampicin/Isoniazid/Pyrazinamide/Ethambutol)', dosage: 'Weight-based FDC', duration: '2 months intensive', notes: 'Intensive phase' },
      { medication: 'RH (Rifampicin/Isoniazid)', dosage: 'Weight-based FDC', duration: '4 months continuation', notes: 'Continuation phase' }
    ],
    precautions: ['Baseline LFTs', 'Monitor hepatotoxicity', 'Pyridoxine supplementation with INH'],
    whenToRefer: ['MDR-TB suspected', 'Treatment failure', 'Severe hepatotoxicity', 'Extrapulmonary TB'],
    patientCounseling: ['DOTS adherence', 'Complete full 6 months', 'Cough hygiene', 'Contact tracing']
  },
  {
    id: 'anemia-01',
    condition: 'Iron Deficiency Anemia',
    symptoms: ['Fatigue', 'Pallor', 'Dizziness', 'Palpitations', 'Shortness of breath'],
    firstLine: [
      { medication: 'Ferrous Sulfate', dosage: '200 mg PO (65 mg elemental Fe)', duration: 'BID–TID for 3–6 months', notes: 'Take on empty stomach with vitamin C' }
    ],
    secondLine: [
      { medication: 'Iron Sucrose', dosage: '200 mg IV', duration: 'per session', notes: 'If oral intolerant or severe' }
    ],
    precautions: ['GI side effects common', 'Avoid with tea/coffee/milk', 'Investigate underlying cause'],
    whenToRefer: ['Hb <7 g/dL', 'Suspected GI malignancy', 'Non-responsive to oral iron'],
    patientCounseling: ['Take iron with vitamin C (orange juice)', 'Black stools are normal', 'Continue for 3 months after Hb normalizes']
  },
  {
    id: 'gerd-01',
    condition: 'Gastroesophageal Reflux Disease (GERD)',
    symptoms: ['Heartburn', 'Acid regurgitation', 'Dysphagia', 'Chest pain'],
    firstLine: [
      { medication: 'Omeprazole', dosage: '20 mg PO', duration: 'daily 4–8 weeks', notes: 'PPI' }
    ],
    secondLine: [
      { medication: 'Ranitidine', dosage: '150 mg PO', duration: 'BID', notes: 'H2RA alternative' }
    ],
    precautions: ['Elevate head of bed', 'Avoid late meals', 'Weight loss if overweight'],
    whenToRefer: ['Alarm symptoms (dysphagia, weight loss, GI bleed)', 'Refractory symptoms'],
    patientCounseling: ['Avoid triggers (spicy food, alcohol, coffee)', 'Do not lie down after eating', 'Lifestyle modifications']
  },
  {
    id: 'conjunctivitis-01',
    condition: 'Conjunctivitis (Bacterial)',
    symptoms: ['Red eye', 'Purulent discharge', 'Crusting', 'Tearing'],
    firstLine: [
      { medication: 'Chloramphenicol eye drops', dosage: '1 drop', duration: 'q2h for 2 days, then q4h for 5 days', notes: 'First-line topical' }
    ],
    secondLine: [
      { medication: 'Ciprofloxacin eye drops', dosage: '1 drop', duration: 'q2h for 2 days, then q4h', notes: 'If no response' }
    ],
    precautions: ['Hand hygiene', 'Avoid sharing towels', 'Do not patch the eye'],
    whenToRefer: ['Visual loss', 'Corneal involvement', 'Neonatal conjunctivitis', 'No improvement in 5 days'],
    patientCounseling: ['Wash hands frequently', 'Avoid touching eyes', 'Complete course of drops']
  },
  {
    id: 'scabies-01',
    condition: 'Scabies',
    symptoms: ['Intense itching (worse at night)', 'Burrow marks', 'Papular rash', 'Interdigital lesions'],
    firstLine: [
      { medication: 'Permethrin 5% cream', dosage: 'Apply neck down', duration: 'Leave 8–12 h, repeat in 1 week', notes: 'First-line' }
    ],
    secondLine: [
      { medication: 'Ivermectin', dosage: '200 mcg/kg PO', duration: 'single dose, repeat in 2 weeks', notes: 'For crusted scabies or treatment failure' }
    ],
    precautions: ['Treat all household contacts simultaneously', 'Wash bedding/clothing in hot water'],
    whenToRefer: ['Crusted (Norwegian) scabies', 'Secondary bacterial infection'],
    patientCounseling: ['Itching may persist 2–4 weeks after treatment (does not mean failure)', 'Treat all close contacts']
  },
  {
    id: 'ringworm-01',
    condition: 'Dermatophytosis (Ringworm / Tinea)',
    symptoms: ['Circular scaly patches', 'Itching', 'Ring-shaped lesions', 'Hair loss (scalp)'],
    firstLine: [
      { medication: 'Clotrimazole 1% cream', dosage: 'Apply BID', duration: '2–4 weeks', notes: 'Topical antifungal' }
    ],
    secondLine: [
      { medication: 'Griseofulvin', dosage: '500 mg PO', duration: 'daily 4–6 weeks', notes: 'For scalp/nail involvement' }
    ],
    precautions: ['Keep area dry', 'Avoid sharing personal items'],
    whenToRefer: ['Widespread infection', 'Nail involvement', 'Immunocompromised'],
    patientCounseling: ['Continue treatment 1 week after lesions clear', 'Avoid sharing combs/towels']
  },
  {
    id: 'worms-01',
    condition: 'Intestinal Worms (Helminthiasis)',
    symptoms: ['Abdominal pain', 'Diarrhea', 'Worms in stool', 'Anal itching', 'Malnutrition'],
    firstLine: [
      { medication: 'Albendazole', dosage: '400 mg PO', duration: 'single dose', notes: 'For roundworm, hookworm, whipworm' },
      { medication: 'Mebendazole', dosage: '100 mg PO', duration: 'BID 3 days', notes: 'Alternative' }
    ],
    secondLine: [
      { medication: 'Praziquantel', dosage: '40 mg/kg PO', duration: 'single dose', notes: 'For tapeworm/schistosomiasis' }
    ],
    precautions: ['Avoid in first trimester', 'Deworming campaigns every 6 months in endemic areas'],
    whenToRefer: ['Intestinal obstruction', 'Heavy infection with complications'],
    patientCounseling: ['Hygiene: handwashing, wear shoes', 'Deworm whole family', 'Safe water and food']
  },
  {
    id: 'otitis-media-01',
    condition: 'Acute Otitis Media',
    symptoms: ['Ear pain', 'Fever', 'Hearing loss', 'Ear discharge', 'Irritability in children'],
    firstLine: [
      { medication: 'Amoxicillin', dosage: '80–90 mg/kg/day PO', duration: 'divided BID–TID for 7–10 days', notes: 'First-line antibiotic' }
    ],
    secondLine: [
      { medication: 'Amoxicillin-Clavulanate', dosage: '90 mg/kg/day PO', duration: 'BID 10 days', notes: 'If no response in 48–72 h' }
    ],
    precautions: ['Pain management with paracetamol/ibuprofen'],
    whenToRefer: ['Mastoiditis', 'Recurrent AOM (≥3 in 6 months)', 'Persistent effusion >3 months'],
    patientCounseling: ['Complete antibiotic course', 'Follow up if no improvement in 48 h']
  },
  {
    id: 'cellulitis-01',
    condition: 'Cellulitis / Skin & Soft Tissue Infection',
    symptoms: ['Red swollen skin', 'Warmth', 'Tenderness', 'Fever'],
    firstLine: [
      { medication: 'Flucloxacillin', dosage: '500 mg PO', duration: 'QID 7 days', notes: 'First-line for non-purulent cellulitis' },
      { medication: 'Cloxacillin', dosage: '500 mg PO', duration: 'QID 7 days', notes: 'Alternative' }
    ],
    secondLine: [
      { medication: 'Clindamycin', dosage: '300 mg PO', duration: 'TID 7 days', notes: 'If penicillin allergy' }
    ],
    precautions: ['Mark borders to monitor spread', 'Elevate affected limb'],
    whenToRefer: ['Rapidly spreading', 'Systemic toxicity', 'Abscess needing drainage', 'Necrotizing fasciitis suspected'],
    patientCounseling: ['Complete antibiotic course', 'Keep wound clean', 'Return if worsening despite treatment']
  },
  {
    id: 'epilepsy-01',
    condition: 'Epilepsy (Chronic Management)',
    symptoms: ['Recurrent seizures', 'Convulsions', 'Altered consciousness'],
    firstLine: [
      { medication: 'Carbamazepine', dosage: '200 mg PO', duration: 'BID, titrate up', notes: 'Focal seizures' },
      { medication: 'Sodium Valproate', dosage: '200–500 mg PO', duration: 'BID', notes: 'Generalized seizures; avoid in women of childbearing age' }
    ],
    secondLine: [
      { medication: 'Phenytoin', dosage: '100 mg PO', duration: 'TID', notes: 'Monitor levels' }
    ],
    precautions: ['Regular drug level monitoring', 'Avoid abrupt discontinuation', 'Teratogenicity counseling'],
    whenToRefer: ['Refractory epilepsy', 'Status epilepticus', 'Diagnostic uncertainty'],
    patientCounseling: ['Take medication daily', 'Avoid triggers (sleep deprivation, alcohol)', 'Safety: avoid heights, swimming alone']
  },
  {
    id: 'depression-01',
    condition: 'Depression (Major Depressive Disorder)',
    symptoms: ['Persistent sadness', 'Loss of interest', 'Fatigue', 'Sleep changes', 'Appetite changes', 'Suicidal thoughts'],
    firstLine: [
      { medication: 'Fluoxetine', dosage: '20 mg PO', duration: 'daily', notes: 'SSRI – first-line; onset 2–4 weeks' }
    ],
    secondLine: [
      { medication: 'Amitriptyline', dosage: '25–75 mg PO', duration: 'nocte', notes: 'TCA – if SSRI unavailable; useful for pain comorbidity' }
    ],
    precautions: ['Monitor for suicidality in first weeks', 'Avoid abrupt discontinuation'],
    whenToRefer: ['Active suicidal ideation', 'Psychotic features', 'Non-response after 8 weeks'],
    patientCounseling: ['Medication takes 2–4 weeks to work', 'Do not stop abruptly', 'Combine with counseling/therapy']
  },
  {
    id: 'eczema-01',
    condition: 'Eczema (Atopic Dermatitis)',
    symptoms: ['Itchy skin', 'Dry patches', 'Erythema', 'Lichenification'],
    firstLine: [
      { medication: 'Emollient (e.g., aqueous cream)', dosage: 'Apply liberally', duration: 'daily/BID', notes: 'Mainstay of treatment' },
      { medication: 'Hydrocortisone 1% cream', dosage: 'Apply thinly', duration: 'BID up to 7 days', notes: 'Mild topical steroid for flares' }
    ],
    secondLine: [
      { medication: 'Betamethasone 0.1% cream', dosage: 'Apply thinly', duration: 'BID up to 5 days', notes: 'Moderate potency – body only, not face' }
    ],
    precautions: ['Avoid prolonged steroid use on face/groin', 'Identify and avoid triggers'],
    whenToRefer: ['Severe widespread eczema', 'Secondary infection', 'Non-responsive to treatment'],
    patientCounseling: ['Moisturize daily', 'Short lukewarm baths', 'Avoid harsh soaps', 'Wear cotton clothing']
  },
  {
    id: 'gout-01',
    condition: 'Gout (Acute Gouty Arthritis)',
    symptoms: ['Sudden joint pain', 'Swelling', 'Redness', 'Warm joint', 'Big toe pain'],
    firstLine: [
      { medication: 'Indomethacin', dosage: '50 mg PO', duration: 'TID for 3–5 days', notes: 'NSAID – first-line for acute attack' },
      { medication: 'Colchicine', dosage: '0.5 mg PO', duration: 'BID–TID for 3 days', notes: 'If NSAIDs contraindicated' }
    ],
    secondLine: [
      { medication: 'Prednisolone', dosage: '30 mg PO', duration: 'daily 5 days', notes: 'If NSAIDs & colchicine contraindicated' }
    ],
    precautions: ['Do NOT start allopurinol during acute attack', 'Adequate hydration'],
    whenToRefer: ['Tophaceous gout', 'Recurrent attacks', 'Renal impairment'],
    patientCounseling: ['Avoid alcohol, red meat, organ meats', 'Stay hydrated', 'Long-term urate-lowering therapy if recurrent']
  }
];

export default extraGuidelines;
