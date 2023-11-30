<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Page;
use Illuminate\Support\Facades\DB;

class PageController extends Controller
{
    public function getPages()
    {
        $pages = Page::orderBy("id")->get();
        if (!$pages) {
            // Manejar el caso en el que no se encuentra la página
            return Response::json(['status' => 'error', 'message' => 'Páginas no encontradas'], 404);
        }
        return Response::json(['status' => 'success', 'data' => $pages], 200);
    }

    public function getPage($id)
    {
        $page = Page::find($id);
        if (!$page) {
            // Manejar el caso en el que no se encuentra la página
            return Response::json(['status' => 'error', 'message' => 'Página no encontrada'], 404);
        }
        return Response::json(['status' => 'success', 'data' => $page], 200);
    }

    public function getPageDomainAndApiKey($id)
    {
        $page = Page::find($id);
        if (!$page) {
            // Manejar el caso en el que no se encuentra la página
            return Response::json(['status' => 'error', 'message' => 'Página no encontrada'], 404);
        }
        return Response::json([
            'status' => 'success',
            'data' => [
                'apiKey' => $page->apiKey,
                'domain' => $page->domain,
            ]
        ], 200);
    }

    public function getSectionPage($sectionID)
    {
        $page = DB::select("SELECT * FROM app_page p INNER JOIN section s ON p.id=s.page_id WHERE s.id=?", [$sectionID]);
        if (!$page) {
            // Manejar el caso en el que no se encuentra la página
            return Response::json(['status' => 'error', 'message' => 'Página no encontrada'], 404);
        }
        return Response::json(['status' => 'success', 'data' => $page], 200);
    }
}
