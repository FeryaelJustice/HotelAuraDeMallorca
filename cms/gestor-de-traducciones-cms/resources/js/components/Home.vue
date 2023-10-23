<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Formulario de gestor de traducciones para tu web</div>

                    <div class="card-body">
                        <form action="">
                            <fieldset>
                                <legend>Página</legend>
                                <label for="pagename">Nombre de la página</label>
                                <input type="text" id="pagename" name="pagename">
                            </fieldset>
                            <fieldset>
                                <legend>Sección</legend>
                                <label for="pagesection">Sección de la página</label>
                                <input type="text" id="pagesection" name="pagesection">
                            </fieldset>
                            <fieldset v-if="languages">
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
                                                Español
                                            </div>
                                            <div v-else-if="language.lang_code === 'en'">
                                                English
                                            </div>
                                            <div v-else-if="language.lang_code === 'ca'">
                                                Catalan
                                            </div>
                                            <div v-else-if="language.lang_code === 'de'">
                                                German
                                            </div>
                                        </div>
                                    </transition>
                                </div>
                            </fieldset>
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
            languages: []
        }
    },
    methods: {
        changeLanguageFields(lang) {
            this.currentLanguage = lang;
        },
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
</style>
