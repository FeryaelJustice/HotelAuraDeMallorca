<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PageLang extends Model
{
    use HasFactory;
    protected $table = 'app_page_lang';
    protected $primaryKey = 'id';
    protected $fillable = [
        'app_page_id',
        'lang_id',
    ];
}
