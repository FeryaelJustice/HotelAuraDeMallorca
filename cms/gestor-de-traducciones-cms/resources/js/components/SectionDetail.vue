<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Section</div>

                    <div class="card-body">
                        <p>Section: '<b>{{ this.section.section_name }}</b>' of Page: '<b v-if="this.pageSection">{{
                            this.pageSection.app_page_name }}</b>'
                        </p>

                        <table class="table table-striped table-bordered" cellspacing="0" width="100%" id="tbl">
                            <thead>
                                <tr>
                                    <th>LITERAL ID</th>
                                    <th>LITERAL CODE</th>
                                    <th>LITERAL CONTENT</th>
                                    <th v-if="sections">SECTION ID</th>
                                    <th>LANG CODE</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in items" :key="item.id">
                                    <td>{{ item.id }}</td>
                                    <td>
                                        <template v-if="!item.editMode">{{ item.code }}</template>
                                        <template v-else>
                                            <input type="text" v-model="item.code" placeholder="Código del literal" />
                                        </template>
                                    </td>
                                    <td>
                                        <template v-if="!item.editMode">{{ item.content }}</template>
                                        <template v-else>
                                            <textarea v-model="item.content" placeholder="Contenido del literal"></textarea>
                                        </template>
                                    </td>
                                    <td v-if="sections">
                                        <template v-if="!item.editMode">{{ item.section_id }}</template>
                                        <template v-else>
                                            <select v-model="item.section_id">
                                                <option v-for="section in sections" :key="section.id" :value="section.id">
                                                    {{ section.section_name }}
                                                </option>
                                            </select>
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
            pageSection: {},
            sections: {},
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

            if (editedData.code !== '') {
                // Example API call (replace with your actual API endpoint and data)
                axios.put(API_URL + '/translations/updateLiteral', editedData)
                    .then(response => {
                        // Exit edit mode
                        this.items[index].editMode = false;
                        if (response && response.data) {
                            alert(response.data.message);
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        if (error && error.response && error.response.data) {
                            alert(error.response.data.error)
                        }
                    });
            } else {
                alert('El código no puede estar vacío')
            }

        }
    },
    mounted() {
        const sectionId = this.$route.params.id;

        // Get section data
        axios.get(API_URL + '/sections/' + sectionId).then(response => {
            this.section = response.data.data;
            // Get the page data for the section
            axios.get(API_URL + '/pages/section/' + sectionId).then(response => {
                this.pageSection = response.data.data[0]
                // Get the page sections for the select
                axios.get(API_URL + '/sections/pageSections/' + this.pageSection.app_page_id).then(response => {
                    this.sections = response.data.data
                    console.log(this.sections)
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
