<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Literal extends Model
{
    use HasFactory;
    protected $table = 'literal';
    protected $primaryKey = 'id';
    protected $fillable = [
        'literal_text',
    ];
}