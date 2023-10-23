<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Formulario de gestor de traducciones para tu web</div>

                    <div class="card-body">
                        <form action="" id="form" @submit.prevent="onSubmit">
                            <fieldset>
                                <legend>Página</legend>
                                <label for="pagename">Nombre de la página</label>
                                <input type="text" id="pagename" name="pagename" v-model="page" required>
                            </fieldset>
                            <fieldset>
                                <legend>Sección</legend>
                                <label for="pagesection">Sección de la página</label>
                                <input type="text" id="pagesection" name="pagesection" v-model="section" required>
                            </fieldset>
                            <fieldset v-if="languages && languages[0]">
                                <legend>Traducciones</legend>
                                <div class="languageSelect">
                                    <div class="myRow">
                                        <div v-for="language in languages" :key="language.lang_code"
                                            style="margin-left:10px">
                                            <button type="button" class="btn btn-dark btn-space"
                                                @click="changeLanguageFields(language.lang_code)">{{
                                                    language.lang_name }}</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="language-selection" v-for="language in languages" :key="language.lang_code">
                                    <transition name="fade">
                                        <div v-if="language.lang_code == currentLanguage">
                                            <div v-if="language.lang_code === 'es'">
                                                <br>
                                                <span>ESPAÑOL - </span>
                                                <label for="literal_es"></label>
                                                <input type="text" id="literal_es" name="literal_es" v-model="literal_es"
                                                    required>
                                            </div>
                                            <div v-else-if="language.lang_code === 'en'">
                                                <br>
                                                <span>ENGLISH - </span>
                                                <label for="literal_en"></label>
                                                <input type="text" id="literal_en" name="literal_en" v-model="literal_en"
                                                    required>
                                            </div>
                                            <div v-else-if="language.lang_code === 'ca'">
                                                <br>
                                                <span>CATALAN - </span>
                                                <label for="literal_ca"></label>
                                                <input type="text" id="literal_ca" name="literal_ca" v-model="literal_ca"
                                                    required>
                                            </div>
                                            <div v-else-if="language.lang_code === 'de'">
                                                <br>
                                                <span>GERMAN - </span>
                                                <label for="literal_de"></label>
                                                <input type="text" id="literal_de" name="literal_de" v-model="literal_de"
                                                    required>
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
            </div>
        </div>
    </div>
</template>

<script>
import axios from "axios";
import { LanguagesEnum } from "./../util/enums";
const API_URL = "/api";
export default {
    name: 'home',
    data() {
        return {
            currentLanguage: 'es',
            LanguagesEnum,
            languages: [],
            page: '',
            section: '',
            literal_es: '',
            literal_en: '',
            literal_ca: '',
            literal_de: '',
        }
    },
    methods: {
        changeLanguageFields(lang) {
            this.currentLanguage = lang;
        },
        resetForm() {
            this.page = '';
            this.section = '';
            this.literal_es = '';
            this.literal_en = '';
            this.literal_ca = '';
            this.literal_de = '';
        },
        onSubmit() {
            // console.log(this.page, this.section, this.literal_es, this.literal_en, this.literal_ca, this.literal_de)
            let data = {
                page: this.page,
                section: this.section,
                literals: {
                    literal_es: this.literal_es,
                    literal_en: this.literal_en,
                    literal_ca: this.literal_ca,
                    literal_de: this.literal_de
                }
            }
            axios.post(API_URL + '/translations/create', data).then(res => {
                console.log(res)
            }).catch(err => console.error(err))
            this.resetForm();
        }
    },
    mounted() {
        axios.get(API_URL + '/languages').then(response => {
            if (response.data) {
                this.languages = response.data.data;
            } else {
                console.error("No data in response.");
            }
        }).catch(err => console.error(err))
    }
}
</script>
<style lang="scss" scoped>
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

#submit {
    margin-top: 24px;
    border-radius: 6px;
}
</style>
