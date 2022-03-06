import Swal, { SweetAlertOptions } from 'sweetalert2';

const theme = localStorage.getItem('theme');

export const setting_def: SweetAlertOptions = {
    toast: true,
    position: 'top-end',
    width: 444 + 4,
    // heightAuto: false,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 6000,
    timerProgressBar: true,
    color: 'var(--text-color-1)',
    background: 'var(--bg-color-1)',
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
}
export const ask_user: SweetAlertOptions = {
    title: '',
    text: "",
    icon: 'warning',
    showCancelButton: true,
    color: 'var(--text-color-1)',
    background: 'var(--bg-color-1)',
    confirmButtonColor: 'var(--tbc-yellow)',
    cancelButtonColor: 'var(--tbc-red)',
    confirmButtonText: ''
}

export const user_info = {
    showCloseButton: 'true'
}

