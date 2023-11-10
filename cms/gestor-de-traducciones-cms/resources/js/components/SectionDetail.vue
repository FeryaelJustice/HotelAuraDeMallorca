<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Section</div>

                    <div class="card-body">
                        <p>Section: '<b>{{ this.section.section_name }}</b>' of Page: '<b>{{ this.page.app_page_name }}</b>'
                        </p>

                        <table class="table table-striped table-bordered" cellspacing="0" width="100%" id="tbl">
                            <thead>
                                <tr>
                                    <th>LITERAL ID</th>
                                    <th>LITERAL CODE</th>
                                    <th>LITERAL CONTENT</th>
                                    <th>SECTION ID</th>
                                    <th>LANG CODE</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in items" :key="item.id">
                                    <td>{{ item.literal_id }}</td>
                                    <td>
                                        <template v-if="!item.editMode">{{ item.code }}</template>
                                        <template v-else>
                                            <input type="text" v-model="item.code" />
                                        </template>
                                    </td>
                                    <td>
                                        <template v-if="!item.editMode">{{ item.content }}</template>
                                        <template v-else>
                                            <input type="text" v-model="item.content" />
                                        </template>
                                    </td>
                                    <td>
                                        <template v-if="!item.editMode">{{ item.section_id }}</template>
                                        <template v-else>
                                            <input type="number" v-model="item.section_id">
                                        </template>
                                    </td>
                                    <td>{{ item.lang_code }}</td>
                                    <td>
                                        <input type="checkbox" id="edit" name="edit" v-model="item.editMode"
                                            @change="toggleEditMode(index)" />
                                        <label for="edit">Edit?</label>
                                        <!-- Show the "Save Changes" button only for rows in edit mode -->
                                        <button v-if="item.editMode" @click="saveChanges(index)">Save Changes</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <button @click="saveChanges">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from "axios";
const API_URL = "/api";
export default {
    name: 'sections/:id',
    data() {
        return {
            section: {},
            page: {},
            items: [],
            originalData: [], // Added to store the original data for each row
        }
    },
    methods: {
        toggleEditMode(index) {
            // Here we need to only disable the edit mode for the rest of the literals
            this.items.forEach((item, i) => {
                if (i !== index) {
                    item.editMode = false;
                }
            });

            // If disable edit mode, restore item to the original data
            if (!this.items[index].editMode) {
                this.items[index] = Object.assign({}, this.originalData[index]);
            }
        },
        saveChanges(index) {
            // Implement your logic to save changes
            // Access the modified data from this.items[index]
            console.log("Saving changes for row:", this.items[index]);

            // Make API call to save the changes for the specific row
            const editedData = this.items[index];

            // Example API call (replace with your actual API endpoint and data)
            axios.put(API_URL + '/translations/updateLiteral/' + editedData.literal_id, editedData)
                .then(response => {
                    // Exit edit mode
                    this.items[index].editMode = false;
                })
                .catch(error => {
                    console.log(error);
                    // Handle error if the API call fails
                    // You may want to provide user feedback
                });
        },
    },
    mounted() {
        const sectionId = this.$route.params.id;

        axios.get(API_URL + '/sections/' + sectionId).then(response => {
            this.section = response.data.data;
            // Get the page data for the section
            axios.get(API_URL + '/pages/' + sectionId).then(response => {
                this.page = response.data.data
                // Get the page sections for the select
                axios.get(API_URL + '/sections/pageSections/' + this.page.id).then(response => {
                    console.log(response.data.data);
                }).catch(error => { console.log(error) })
            }).catch(error => {
                console.log(error)
            })
        }).catch(error => {
            console.log(error)
        })

        axios.get(API_URL + '/translations/sectionLiterals/' + sectionId).then(response => {
            response.data.data.forEach((sectionLiteral) => {
                const item = sectionLiteral;
                item.editMode = false;
                this.items.push(item)
                // Deep copy of the original data
                this.originalData.push({ ...item });
            })
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
