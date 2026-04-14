import Swal from "sweetalert2";

/**
 * General-purpose alert with configurable icon, message, and options.
 * Defaults to auto-dismiss after 1400ms with no confirm button.
 */
export function showAlert(type, title, message, options = {}) {
  const icons = {
    success: "success",
    error: "error",
    warning: "warning",
    info: "info",
  };

  const defaultTimers = {
    success: 1500,
    error: 2000, 
    warning: 2500,
    info: 2000,
  };

  return Swal.fire({
    icon: icons[type] ?? "info",
    title: title,
    text: message,
    timer: options.timer ?? defaultTimers[type] ?? 2000,
    showConfirmButton: options.showConfirmButton ?? false,
    timerProgressBar: true, // shows a progress bar while timer runs
    ...options,
  });
}

/**
 * Success toast shown after a POST request completes.
 * Auto-dismisses after 1500ms.
 */
export function showPostSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: message,
    timer: 1500,
    showConfirmButton: false,
  });
}

/**
 * Error dialog shown when a POST request fails.
 * Requires user confirmation to dismiss.
 */
export function showPostError(message) {
  return Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
    showConfirmButton: true,
  });
}

/**
 * Success toast shown after a PUT/PATCH request completes.
 * Auto-dismisses after 1500ms.
 */
export function showUpdateSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: message,
    timer: 1500,
    showConfirmButton: false,
  });
}

/**
 * Error dialog shown when a PUT/PATCH request fails.
 * Requires user confirmation to dismiss.
 */
export function showUpdateError(message) {
  return Swal.fire({
    icon: "error",
    title: message,
    showConfirmButton: true,
  });
}

/**
 * Confirmation dialog shown before a delete action.
 * Returns the Swal result — check result.isConfirmed before proceeding.
 */
export function deleteAlert(
  title = "Are you sure?",
  message = "You won't be able to undo this!",
) {
  return Swal.fire({
    title,
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });
}

/**
 * Error dialog shown when a delete operation fails on the server.
 */
export function deleteErrorAlert(
  title = "Delete Failed!",
  message = "Unable to delete this item. Please try again.",
) {
  return Swal.fire({
    title,
    text: message,
    icon: "error",
    confirmButtonColor: "#d33",
    confirmButtonText: "OK",
  });
}

/**
 * Generic success toast — use showPostSuccess or showUpdateSuccess
 * for operation-specific feedback; this is for standalone success messages.
 */
export function showSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: message,
    timer: 1500,
    showConfirmButton: false,
  });
}

/**
 * Generic error dialog — use showPostError or showUpdateError
 * for operation-specific feedback; this is for standalone error messages.
 */
export function showError(message) {
  return Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
  });
}

/**
 * Confirmation dialog for actions requiring explicit user consent (e.g. LOP warning).
 * Returns the Swal result — check result.isConfirmed before proceeding.
 */
export async function showConfirm(message) {
  return Swal.fire({
    icon: "question",
    title: "Are you sure?",
    text: message,
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes",
  });
}

/**
 * Flexible dialog used for drag-and-drop interactions or custom UI flows.
 * All Swal options can be overridden via the options argument.
 */
export function showDragAlert(options = {}) {
  return Swal.fire({
    icon: options.icon ?? "info",
    title: options.title ?? "",
    text: options.text ?? "",
    html: options.html,
    showConfirmButton: options.showConfirmButton ?? true,
    showCancelButton: options.showCancelButton ?? false,
    confirmButtonText: options.confirmButtonText ?? "OK",
    cancelButtonText: options.cancelButtonText ?? "Cancel",
    confirmButtonColor: options.confirmButtonColor ?? "#1976d2",
    cancelButtonColor: options.cancelButtonColor ?? "#d33",
    timer: options.timer,
    reverseButtons: options.reverseButtons ?? false,
    allowOutsideClick: options.allowOutsideClick ?? true,
    ...options,
  });
}

/**
 * Error dialog shown when an uploaded file has an unsupported format.
 */
export function invalidDocFormatAlert() {
  return Swal.fire({
    icon: "error",
    title: "Invalid File Format",
    text: "Only PDF, JPG, JPEG, PNG files are allowed.",
    confirmButtonColor: "#d32f2f",
  });
}

/**
 * Error dialog shown when an uploaded file exceeds the size limit.
 */
export function invalidDocSizeAlert() {
  return Swal.fire({
    icon: "error",
    title: "File Too Large",
    text: "File size must be less than 1 MB.",
    confirmButtonColor: "#d32f2f",
  });
}

/**
 * Escape hatch that passes a raw Swal options object directly.
 * Use only when none of the typed helpers above fit the use case.
 */
export function showSwal(options) {
  return Swal.fire(options);
}
