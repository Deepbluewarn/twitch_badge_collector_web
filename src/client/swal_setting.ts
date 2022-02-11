import type Swal from 'sweetalert2/dist/sweetalert2.js';

export const setting_def = {
    toast: true,
    position: 'top-end',
    width: 444 + 4,
    // heightAuto: false,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 6000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
}

export const user_info = {
    showCloseButton: 'true'
}
