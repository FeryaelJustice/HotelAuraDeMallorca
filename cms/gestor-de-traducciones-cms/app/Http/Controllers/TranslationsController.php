<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Literal;
use App\Models\Section;
use App\Models\Page;
use Illuminate\Support\Facades\DB;

class TranslationsController extends Controller
{
    public function createTranslation(Request $request)
    {
        $postData = $request->all();
        $page = Page::where('app_page_name', $postData['page'])->first();
        $section = Section::where('section_name', $postData['section'])->first();

        if (!$page) {
            return Response::json(['status' => '404', 'message' => 'Page not found'], 200);
        }

        if (!$section) {
            return Response::json(['status' => '404', 'message' => 'Section not found'], 200);
        }

        $literals = $postData['literals'];

        try {
            foreach ($literals as $literal) {
                $literalObj = new Literal();
                $literalObj->literal_text = $literal;
                $literalObj->save();
                $literalID = $literalObj->id;
                // Check if $section exists before inserting into the section_literal table

                if ($section && $literalObj) {
                    DB::table('section_literal')->insert(['section_id' => $section->id, 'literal_id' => $literalID]);
                }
            }
            return Response::json(['status' => 'success', 'message' => 'Success!'], 200);
        } catch (\Exception $e) {
            return Response::json(['status' => '404', 'message' => 'Error inserting'], 404);
        }

    }
}
