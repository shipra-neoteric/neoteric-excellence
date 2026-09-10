import Swal from 'sweetalert2';

// Native confirm()/alert() are never used (style guide §13) — everything goes
// through sweetalert2.
export async function confirmSignOut() {
  const { isConfirmed } = await Swal.fire({
    title: 'Sign out?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sign out',
    confirmButtonColor: '#dc2626',
  });
  return isConfirmed;
}

export async function confirmDelete(label) {
  const { isConfirmed } = await Swal.fire({
    title: `Delete ${label}?`,
    text: 'This cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#dc2626',
  });
  return isConfirmed;
}

// A brief, self-dismissing confirmation toast — for "this just succeeded" moments
// (e.g. a trainee submitting their daily log) that need to be genuinely noticeable,
// not just a small line of text sitting on the page that's easy to miss and
// disappears the moment you touch anything else.
export function toastSuccess(message) {
  return Swal.fire({
    toast: true,
    position: 'top',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
}
