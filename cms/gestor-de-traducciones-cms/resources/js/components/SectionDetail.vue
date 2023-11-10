<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Section</div>

                    <div class="card-body">
                        <p>Section ID: {{ this.$route.params.id }}</p>
                        <!-- <EasyDataTable :headers="headers" :items="items" buttons-pagination show-index
                            @click-row="rowSelected" /> -->

                        <table class="table table-striped table-bordered" cellspacing="0" width="100%" id="tbl">
                            <thead>
                                <tr>
                                    <th>LITERAL ID</th>
                                    <th>LITERAL CODE</th>
                                    <th>LITERAL CONTENT</th>
                                    <th>SECTION ID</th>
                                    <th>LANG CODE</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in items" :key="item.id">
                                    <td>{{ item.literal_id }}</td>
                                    <td>{{ item.code }}</td>
                                    <td>{{ item.content }}</td>
                                    <td>{{ item.section_id }}</td>
                                    <td>{{ item.lang_code }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { RouterLink } from 'vue-router';
// import type { Header, Item, ClickRowArgument } from "vue3-easy-data-table";
import axios from "axios";
const API_URL = "/api";

// const headers: Header[] = [
//     { text: "LITERAL ID", value: "literal_id" },
//     { text: "LITERAL CODE", value: "code" },
//     { text: "LITERAL CONTENT", value: "content" },
//     { text: "SECTION ID", value: "section_id" },
//     { text: "LANG CODE", value: "lang_code" },
// ];

// const items: Item[] = [
//     { id: "Stephen Curry", section_name: "GSW" },
//     { id: "Lebron James", section_name: "LAL" },
//     { id: "Kevin Durant", section_name: "BKN" },
//     { id: "Giannis Antetokounmpo", section_name: "MIL" },
// ];

export default {
    name: 'sections/:id',
    components: {
        RouterLink,
    },
    data() {
        return {
            // headers: headers,
            items: [],
        }
    },
    methods: {
        // rowSelected(item: ClickRowArgument) {
        //     console.log(item)
        // }
    },
    mounted() {
        // console.log('Pages mounted.')
        const sectionId = this.$route.params.id;
        console.log('Section ID:', sectionId);

        axios.get(API_URL + '/translations/sectionLiterals/' + sectionId).then(response => {
            console.log(response.data.data)
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
