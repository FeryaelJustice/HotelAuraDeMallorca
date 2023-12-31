<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Formulario de gestor de traducciones para tu web</div>

                    <div class="card-body">
                        <h2>Inserta tus traducciones</h2>
                        <span><em>No debes poner un código de literal que esté ya en la base de datos.</em></span>
                        <form action="" id="form" @submit.prevent="onSubmit">
                            <fieldset>
                                <legend>Página</legend>
                                <label for="pageSelect">Página</label>
                                <select v-model="selectedPageId" id="pageSelect" name="pageSelect" required>
                                    <option v-for="page in pages" :key="page.id" :value="page.id">
                                        {{ page.name }}
                                    </option>
                                </select>
                            </fieldset>
                            <fieldset>
                                <legend>Sección</legend>
                                <label for="sectionSelect">Sección de la página</label>
                                <select v-model="selectedSectionId" id="sectionSelect" name="sectionSelect" required>
                                    <option v-for="section in filteredSections" :key="section.id" :value="section.id">
                                        {{ section.page_name + ' - ' + section.section_name }}
                                    </option>
                                </select>
                            </fieldset>
                            <fieldset v-if="languages && languages[0]">
                                <legend>Traducciones</legend>
                                <div class="languageSelect">
                                    <div class="myRow">
                                        <div v-for="language in languages" :key="language.lang_code">
                                            <button type="button" class="btn btn-dark btn-space"
                                                @click="changeLanguageFields(language.lang_code)"
                                                :class="{ 'btn-selected': language.lang_code === currentLanguage }">{{
                                                    language.lang_name }}</button>
                                        </div>
                                    </div>
                                </div>
                                <em>Todos los códigos de los literales deben coincidir al insertar (se accederá por el mismo
                                    código diferenciando en idiomas)</em>
                                <div class="language-selection" v-for="language in languages" :key="language.lang_code">
                                    <transition name="fade">
                                        <div v-if="language.lang_code == currentLanguage">
                                            <br>
                                            <div class="literal">
                                                <span>{{ language.lang_name }}</span>
                                                <label :for="'literal' + language.lang_code + '_code'">Introduce el código
                                                    del literal</label>
                                                <input type="text" class="text" maxlength="1000"
                                                    :id="'literal_' + language.lang_code + '_code'"
                                                    :name="'literal_' + language.lang_code + '_code'"
                                                    v-model="literals['literal_' + language.lang_code].code"
                                                    placeholder="Código para identificar el literal (en la página y no repetido en ella, en distintas si)"
                                                    required>
                                                <label :for="'literal_' + language.lang_code + '_content'">Introduce el
                                                    contenido del literal</label>
                                                <textarea class="textarea"
                                                    :id="'literal_' + language.lang_code + '_content'"
                                                    :name="'literal_' + language.lang_code + '_content'"
                                                    v-model="literals['literal_' + language.lang_code].content"
                                                    @keypress.enter="handleTextAreaEnter('literal_' + language.lang_code + '_code', $event)"
                                                    placeholder="Contenido del literal" required></textarea>
                                            </div>
                                        </div>
                                    </transition>
                                </div>
                            </fieldset>
                            <span v-else>No hay traducciones</span>
                            <button type="submit" id="submit">Guardar</button>
                        </form>
                    </div>
                </div>
                <br>
            </div>
        </div>
    </div>
</template>

<script>
import axios from "axios";
const API_URL = "/api";

export default {
    name: 'home',
    data() {
        return {
            currentLanguage: 'es',
            languages: [],
            pages: [],
            sections: [],
            selectedPageId: null,
            selectedSectionId: null,
            literals: {}
        }
    },
    computed: {
        filteredSections() {
            // Filter the sections based on the selectedPageId
            return this.sections.filter(section => section.page_id === this.selectedPageId);
        },
    },
    watch: {
        selectedPageId(newValue) {
            // Find the first section that matches the new page selection
            const firstSection = this.filteredSections.find(section => section.page_id === newValue);

            // Update the selectedSectionId with the first section's ID
            if (firstSection) {
                this.selectedSectionId = firstSection.id;
            }
        }
    },
    methods: {
        changeLanguageFields(lang) {
            this.currentLanguage = lang;
        },
        handleTextAreaEnter(modelName, event) {
            if (event.keyCode === 13) {
                event.preventDefault(); // Prevent form submission

                // Get the corresponding v-model property and textarea element
                const model = this[modelName];
                const textarea = event.target;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;

                // Insert a newline character ('\n') at the current cursor position
                this[modelName] =
                    model.substring(0, start) + '\n' + model.substring(end);

                // Move the cursor to the position just after the inserted newline
                const newCursorPosition = start + 1;
                textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        },
        setDefaultFormValues() {
            // Default form values
            if (this.pages.length > 0) {
                this.selectedPageId = this.pages[0].id;
            }
            if (this.filteredSections.length > 0) {
                this.selectedSectionId = this.filteredSections[0].id;
            }
        },
        emptyForm() {
            this.currentLanguage = 'es';
            this.setDefaultFormValues();
            this.generateLiterals(this.languages);

        },
        generateLiterals(languages) {
            // Generate the literals object based on the available languages
            const literals = {};
            for (const language of languages) {
                const langCode = language.lang_code;
                literals[`literal_${langCode}`] = {
                    code: '',
                    content: '',
                    lang_code: langCode
                };
            }
            this.literals = literals;
        },
        checkForm() {
            if (this.page == '') {
                return false;
            }
            if (this.section == '') {
                return false;
            }
            if (!this.literals) {
                return false;
            } else {
                let codesArray = []; // to check if all codes are the same
                for (const languageKey of Object.keys(this.literals)) {
                    if (languageKey == '') {
                        return false;
                    }
                    const languageObject = this.literals[languageKey];
                    for (const propertyName of Object.keys(languageObject)) {
                        const propertyValue = languageObject[propertyName];
                        if (propertyName == 'code') {
                            console.log('prop name: ' + propertyName)
                            console.log('value: ' + propertyValue)
                            codesArray.push(propertyValue);
                        }
                        // Do something with the property name and value
                        if (propertyName == '' || propertyValue == '') {
                            return false;
                        }
                        // console.log(`Language: ${languageKey}, Property: ${propertyName}, Value: ${propertyValue}`);
                    }
                }

                const allEqual = codesArray.every((value) => value === codesArray[0]);
                if (!allEqual) {
                    return false;
                }
            }
            return true;
        },
        onSubmit() {
            // console.log(this.page, this.section, this.literal_es, this.literal_en, this.literal_ca, this.literal_de)
            if (this.checkForm()) {
                // Append lang code to each literal code
                // for (const languageKey of Object.keys(this.literals)) {
                //     this.literals[languageKey].code = this.selectedSectionId + '_' + this.selectedSectionId + '_' + this.literals[languageKey].code + '_' + languageKey.split('_')[1];
                // }

                // Create the data to send
                let data = {
                    page: this.selectedPageId,
                    section: this.selectedSectionId,
                    literals: this.literals
                }

                // Create
                axios.post(API_URL + '/translations/create', data).then(res => {
                    alert(res.data.message)

                    axios.get(API_URL + '/pages/domainAndApiKey/' + this.selectedPageId).then(async response => {
                        const apiKey = response.data.data.apiKey;
                        const domain = response.data.data.domain;

                        // Find the page in the pages array based on selectedPageId
                        // const selectedPage = this.pages.find(page => page.id === this.selectedPageId);

                        if (domain) {
                            const formData = new FormData();
                            formData.append('translatorKey', apiKey);
                            // if (selectedPage.name == 'Intranet Vacalia') {
                            await axios.post(`${domain}/updates.php`, formData)
                            // }
                        }

                        this.emptyForm();
                    }).catch(error => { console.log(error) })
                }).catch(err => {
                    if (err && err.response && err.response.data) {
                        alert('Ha ocurrido un error realizando la inserción: ' + err.response.data.message.errorInfo[2])
                    }
                }
                )
                // this.resetForm();
            } else {
                alert('Debes rellenar todos los literales en todos los idiomas o los códigos de los idiomas no coinciden')
            }
        }
    },
    mounted() {
        const languagesPromise = axios.get(API_URL + '/languages');
        const pagesPromise = axios.get(API_URL + '/pages');
        const sectionsPromise = axios.get(API_URL + '/sections');

        // Wait for all the requests to complete
        Promise.all([languagesPromise, pagesPromise, sectionsPromise]).then(responses => {
            // Get the data from the responses
            const languages = responses[0].data.data;
            const pages = responses[1].data.data;
            const sections = responses[2].data.data;

            // Iterate over the sections and check if they exist and have a length greater than 0
            if (sections && sections.length > 0) {
                for (const section of sections) {
                    // Iterate over the pages and get the page.name
                    if (pages && pages.length > 0) {
                        for (const page of pages) {
                            // Append the page.name to the section.page_id
                            if (section.page_id == page.id) {
                                section.page_name = page.name;
                            }
                        }
                    }
                }
            }

            this.languages = languages;
            this.pages = pages;
            this.sections = sections;

            this.generateLiterals(languages);

            this.setDefaultFormValues();
        }).catch(err => console.error(err))
    }
}
</script>
<style lang="scss" scoped>
.card {
    height: 100%;
    width: 100%;
    margin-bottom: 6%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.card-header {
    width: 100%;
    text-align: center;
}

.card-body {
    padding: 0;
    margin: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;

    h2 {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    >span {
        width: 100%;
        display: flex;
        justify-content: center;
    }
}

#form {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.myRow {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    div {
        margin-left: 10px;
    }
}

.literal {
    display: flex;
    flex-direction: column;

    .textarea {
        width: 600px;
        height: 200px;
    }
}

fieldset {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    legend {
        float: none;
        text-align: center;
    }
}

.btn-selected {
    background-color: blue;
}

#submit {
    margin-top: 24px;
    border-radius: 6px;
}

@media screen and (max-width: 768px) {
    .literal {
        .textarea {
            width: initial;
        }
    }
}

@media screen and (max-width: 400px) {
    .myRow {
        flex-direction: column;

        div {
            margin-left: 0;
            margin-bottom: 8px;
        }
    }
}
</style>
