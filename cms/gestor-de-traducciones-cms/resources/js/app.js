import './bootstrap';
import "bootstrap";

import Vue3EasyDataTable from 'vue3-easy-data-table';
import 'vue3-easy-data-table/dist/style.css';

import { createApp } from 'vue';

// VUE ROUTER
import router from './router'

const app = createApp({});

app.use(router);

app.component('EasyDataTable', Vue3EasyDataTable);

app.mount('#app');
