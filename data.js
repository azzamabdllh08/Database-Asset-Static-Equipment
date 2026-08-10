// DATABASE ASSET STATIC EQUIPMENT
// Clean database layer.
// Source of truth: Input RBI.xlsx (OneDrive, Zona 11).
// Only records with Equipment Category = "Static" belong in ASSETS.
// No RBI calculation is performed by this file. Risk 1AP/2AP/3AP values are stored as supplied by the source data.

const ASSETS = [];

const INSPECTIONS = [];

// Expected asset record structure:
// {
//   tag: "",
//   name: "",
//   type: "",
//   area: "",
//   service: "",
//   material: "",
//   risk: "",
//   risk1AP: "",
//   risk2AP: "",
//   risk3AP: "",
//   damageMechanism: "",
//   corrosionRate: "",
//   currentThickness: "",
//   rbiStatus: ""
// }
