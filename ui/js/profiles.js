import { state } from "./state.js";
import { loadSchemaAndDetails } from "./app-data.js";
import { toast } from "./ui.js";
import { profileSlug } from "./utils.js";

const DEFAULT_PROFILES = [
  {
    id: "personal",
    name: "Personal",
    path: "templates/classic/details.personal.yml",
    exists: true,
  },
];

async function apiErrorMessage(res, fallback) {
  try {
    const err = await res.json();
    if (err.error) return err.error;
  } catch {
    /* ignore */
  }
  return fallback;
}

function renderProfileSelect() {
  const sel = document.getElementById("profile-select");
  sel.innerHTML = state.profiles
    .map((p) => {
      const label = p.exists === false ? `${p.name} (missing YAML)` : p.name;
      return `<option value="${p.id}" ${p.id === state.currentProfile ? "selected" : ""}>${label}</option>`;
    })
    .join("");
  sel.value = state.currentProfile;
}

export async function loadProfiles() {
  try {
    const res = await fetch("/api/profiles");
    if (res.ok) {
      state.profiles = await res.json();
    } else {
      state.profiles = [...DEFAULT_PROFILES];
    }
  } catch {
    state.profiles = [...DEFAULT_PROFILES];
  }

  if (!state.profiles.length) {
    state.profiles = [...DEFAULT_PROFILES];
  }

  if (!state.profiles.find((p) => p.id === state.currentProfile)) {
    state.currentProfile = state.profiles[0].id;
  }

  renderProfileSelect();
}

async function activateProfile() {
  await loadSchemaAndDetails();
  const { buildProfile } = await import("./api.js");
  await buildProfile();
}

export function initProfiles() {
  renderProfileSelect();

  document.getElementById("profile-select").addEventListener("change", async (e) => {
    if (state.unsaved) {
      const ok = confirm("You have unsaved changes. Switch profile anyway?");
      if (!ok) {
        e.target.value = state.currentProfile;
        return;
      }
    }
    state.currentProfile = e.target.value;
    await activateProfile();
  });

  document.getElementById("btn-add-profile").addEventListener("click", addProfile);
  document.getElementById("btn-rename-profile").addEventListener("click", renameProfile);
  document.getElementById("btn-delete-profile").addEventListener("click", deleteProfile);
}

async function renameProfile() {
  const current = state.profiles.find((p) => p.id === state.currentProfile);
  if (!current) return;

  const name = prompt(
    "Rename profile (YAML file will be renamed too):",
    current.name,
  );
  if (!name?.trim() || name.trim() === current.name) return;

  let res;
  try {
    res = await fetch(`/api/profiles?profile=${encodeURIComponent(state.currentProfile)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
  } catch {
    toast("✗ Could not rename profile — is the server running?", "error");
    return;
  }

  if (!res.ok) {
    toast(`✗ ${await apiErrorMessage(res, "Could not rename profile")}`, "error");
    return;
  }

  const updated = await res.json();
  state.currentProfile = updated.id;
  await loadProfiles();
  await activateProfile();
  toast(`✓ Renamed to “${name.trim()}”`, "success");
}

async function deleteProfile() {
  if (state.profiles.length <= 1) {
    toast("✗ Cannot delete the only profile", "error");
    return;
  }

  const current = state.profiles.find((p) => p.id === state.currentProfile);
  if (!current) return;

  const ok = confirm(
    `Delete profile “${current.name}”?\n\nThe YAML file on disk is kept.`,
  );
  if (!ok) return;

  let res;
  try {
    res = await fetch(`/api/profiles?profile=${encodeURIComponent(state.currentProfile)}`, {
      method: "DELETE",
    });
  } catch {
    toast("✗ Could not delete profile — is the server running?", "error");
    return;
  }

  if (!res.ok) {
    toast(`✗ ${await apiErrorMessage(res, "Could not delete profile")}`, "error");
    return;
  }

  await loadProfiles();
  state.currentProfile = state.profiles[0].id;
  document.getElementById("profile-select").value = state.currentProfile;
  await activateProfile();
  toast(`✓ Profile “${current.name}” removed`, "success");
}

async function addProfile() {
  const name = prompt("Profile name (e.g. Backend SWE):");
  if (!name?.trim()) return;
  const slug = profileSlug(name);
  const path = prompt(
    "YAML file path (relative to project root):",
    `templates/classic/details.${slug}.yml`,
  );
  if (!path?.trim()) return;

  let res;
  try {
    res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), path: path.trim() }),
    });
  } catch {
    toast("✗ Could not add profile — is the server running?", "error");
    return;
  }

  if (!res.ok) {
    toast(`✗ ${await apiErrorMessage(res, "Could not add profile")}`, "error");
    return;
  }

  const created = await res.json();
  state.currentProfile = created.id;
  await loadProfiles();
  document.getElementById("profile-select").value = created.id;
  await activateProfile();
  toast(`✓ Profile “${created.name}” created`, "success");
}

export function apiQuery() {
  return `template=${encodeURIComponent(state.currentTemplate)}&profile=${encodeURIComponent(state.currentProfile)}`;
}
