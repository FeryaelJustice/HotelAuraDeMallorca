<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Page</div>

                    <div class="card-body">
                        <p>Page ID: {{ this.$route.params.id }}</p>
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
    { text: "SECTION NAME", value: "section_name" },
    { text: "SECTION PARENT ID", value: "section_parent" }
];

// const items: Item[] = [
//     { id: "Stephen Curry", section_name: "GSW" },
//     { id: "Lebron James", section_name: "LAL" },
//     { id: "Kevin Durant", section_name: "BKN" },
//     { id: "Giannis Antetokounmpo", section_name: "MIL" },
// ];

export default {
    name: 'pages/:id',
    components: {
        RouterLink,
    },
    data() {
        return {
            headers: headers,
            items: [],
            pages: [],
        }
    },
    methods: {
        rowSelected(item: ClickRowArgument) {
            const id = item.id;
            this.$router.push(`/sections/${id}`)
        }
    },
    mounted() {
        // console.log('Pages mounted.')
        const pageId = this.$route.params.id;

        axios.get(API_URL + '/sections/pageSections/' + pageId).then(response => {
            this.items = response.data.data;
        }).catch(error => { console.log(error) })

        // For adding a new section
        axios.get(API_URL + '/pages').then(response => {
            this.pages = response.data.data;
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
