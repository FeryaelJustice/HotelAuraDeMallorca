<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Pages</div>

                    <div class="card-body">
                        <EasyDataTable :headers="headers" :items="items" buttons-pagination show-index
                            @click-row="rowSelected" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { RouterLink } from 'vue-router';
import type { Header, Item, ClickRowArgument } from "vue3-easy-data-table";
import axios from "axios";
const API_URL = "/api";

const headers: Header[] = [
    { text: "ID", value: "id" },
    { text: "PAGE NAME", value: "app_page_name" }
];

// const items: Item[] = [
//     { id: "Stephen Curry", app_page_name: "GSW" },
//     { id: "Lebron James", app_page_name: "LAL" },
//     { id: "Kevin Durant", app_page_name: "BKN" },
//     { id: "Giannis Antetokounmpo", app_page_name: "MIL" },
// ];

export default {
    name: 'pages',
    components: {
        RouterLink,
    },
    data() {
        return {
            headers: headers,
            items: [],
        }
    },
    methods: {
        rowSelected(item: ClickRowArgument) {
            const id = item.id;
            this.$router.push(`/pages/${id}`)
        }
    },
    mounted() {
        // console.log('Pages mounted.')
        axios.get(API_URL + '/pages').then(response => {
            this.items = response.data.data;
        }).catch(error => { console.log(error) })
    }
}
</script>
<style lang="scss" scoped>
.card {
    min-height: 80vh;

    .card-body>div {
        min-height: 100%;
    }
}

.card-header {
    width: 100%;
    text-align: center;
}
</style>
