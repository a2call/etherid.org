ETHERID_CONTRACT = "0x18f74374dee5a323ef1d0fe7bbd16c9a16ad3bce"
ETHERID_ABI = 
[{"constant":true,"inputs":[],"name":"root_domain","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"domain","type":"uint256"}],"name":"getDomain","outputs":[{"name":"owner","type":"address"},{"name":"expires","type":"uint256"},{"name":"price","type":"uint256"},{"name":"transfer","type":"address"},{"name":"next_domain","type":"uint256"},{"name":"root_id","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[],"name":"n_domains","outputs":[{"name":"","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"domain","type":"uint256"},{"name":"id","type":"uint256"}],"name":"getId","outputs":[{"name":"v","type":"uint256"},{"name":"next_id","type":"uint256"},{"name":"prev_id","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"domain","type":"uint256"},{"name":"expires","type":"uint256"},{"name":"price","type":"uint256"},{"name":"transfer","type":"address"}],"name":"changeDomain","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"domain","type":"uint256"},{"name":"name","type":"uint256"},{"name":"value","type":"uint256"}],"name":"changeId","outputs":[],"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":false,"name":"domain","type":"uint256"},{"indexed":false,"name":"id","type":"uint256"}],"name":"DomainChanged","type":"event"}]

;

domains = new Array()
ids = new Array()
current_domain = 0
current_block = 0
domain = {}
ether_contract = undefined;
batch_progress = {}
batch_domain_list = []
batch_domain_n = 0
batch_domain_wallet_to_use = ""
batch_domain_cancel = false;
batch_domain_process = ""
batch_is_active = false;
batch_price = 0;

all_domains_data = []
all_domains_curent_domain = 0
all_domains_n = 0;
all_domain_pattern = ""
all_domains_cancel = false;
only_mine = false
only_expired = false
only_for_sale = false

BATCH_PROCESS_TIMEOUT = 1000;
ALL_DOMAINS_TIMEOUT = 200;
ALL_DOMAINS_SEARCH_PORTION = 112;

var all_domains_table
var all_domains_data = new Array();
my_accounts = [];

web3 = require('web3');

ETH1 = new BigNumber( 1000000000000000000 );   
SECONDS_PER_BLOCK = 12;
ETH_SIGN = "\u{1D763}"

function getContract(){
    if( ether_contract ) return ether_contract;
    ether_contract = web3.eth.contract(ETHERID_ABI).at(ETHERID_CONTRACT);
    ether_contract.DomainChanged().watch( function( error, result ) {
        
        if( !batch_is_active )
        {
            $("#stat_domains").text( contract.n_domains() );
            updateDomainPage()
        }
    });
    return ether_contract;
}

function processBatch()
{
    if( batch_domain_cancel )
    {
        batch_progress.setText( "Canceled");
        batch_domain_n = 0;
                
        $('#btn_batch_claim').prop('disabled', false );                
        $('#btn_batch_price').prop('disabled', false );                
        $('#btn_batch_prolong').prop('disabled', false );                
        $('#btn_batch_domain_cancel').prop('disabled', true );     
        $("#batch_title").text( "No active process")
        batch_is_active = false;
        return;
    }
    
    
    if( batch_domain_n >= batch_domain_list.length )
    {
        batch_progress.setText( "Done");
        batch_progress.animate( 1 );
        batch_domain_n = 0;
        if( batch_domain_process == "claim" ) $("#batch_list").val( "" );
                
        $('#btn_batch_claim').prop('disabled', false );                
        $('#btn_batch_price').prop('disabled', false );                
        $('#btn_batch_prolong').prop('disabled', false );                
        $('#btn_batch_domain_cancel').prop('disabled', true );          
        $("#batch_title").text( "No active process")
        batch_is_active = false;
        return;
    }
    
    name = batch_domain_list[ batch_domain_n ];
    
    if( name.substring( 0, 2 ) === "0x" ) 
    {    
        a = hexToArray( name )
        hex = arrayToHex( a )    
        hex = "0x" + hex.substr( 0, 64 )
        ascii = ""
        try {
            ascii = utf8.decode( toAscii( hex ) ) 
        }
        catch( x ) {}
    }
    else
    {
        utf = utf8.encode( name ).slice(0, 32);
        hex = "0x" + asciiToHex( utf )    
        try {
            ascii = utf8.decode( toAscii( hex ) ) 
        }
        catch( x ) {}
    }    
    
    domain = new BigNumber( hex );
    
    batch_progress.setText( ascii );
    
    try 
    {
        var params  = {}
        contract = getContract();
        
        switch( batch_domain_process )
        {
            case "claim":            
                params = {
                            gas: 200000,
                            from : batch_domain_wallet_to_use,
                            value: 0
                        };
                contract.changeDomain.sendTransaction( domain, 2000000, 0, 0, params );
                break;
            case "prolong":            
                
                res = contract.getDomain( domain );

                d = new DomainRecord( domain, res[0], res[1], res[2], res[3] );
                
                params = {
                            gas: 200000,
                            from : d.owner,
                            value: 0
                        };
                contract.changeDomain.sendTransaction( domain, 2000000, d.price, d.transfer, params );
                break;
            case "price":            
                res = contract.getDomain( domain );

                d = new DomainRecord( domain, res[0], res[1], res[2], res[3] );
                
                params = {
                            gas: 200000,
                            from : d.owner,
                            value: 0
                        };
                contract.changeDomain.sendTransaction( domain, 2000000, batch_price, d.transfer, params );
                break;
        }



    }
    catch( err )
    {
        swal( "Error", "Domain: " + hex + " (" + err + ")", "error" );
        
        batch_progress.setText( "Error");
        batch_domain_n = 0;
        $('#btn_batch_claim').prop('disabled', false );                
        $('#btn_batch_price').prop('disabled', false );                
        $('#btn_batch_prolong').prop('disabled', false );                
        $('#btn_batch_domain_cancel').prop('disabled', true );       
        $("#batch_title").text( "No active process")
        batch_is_active = false;
        
        return;
    } 
    
    batch_domain_n++;
    batch_progress.animate( batch_domain_n / batch_domain_list.length );
    
    setTimeout( processBatch, BATCH_PROCESS_TIMEOUT);
}


$().ready( function(e){ 
    
    batch_progress = new ProgressBar.Circle('#batch_progress', {
        color: '#59869b',
        duration: 500,
        easing: 'easeInOut',
        strokeWidth: 2
    });

    update_list_progress = new ProgressBar.Circle('#update_list_progress', {
        color: '#59869b',
        duration: 500,
        easing: 'easeInOut',
        strokeWidth: 2
    });

    
    try
    {
        web3.setProvider( new web3.providers.HttpProvider( ) );    
        contract = getContract();        
        $("#stat_domains").text( contract.n_domains() );
//        root_domain = web3.toHex( contract.root_domain() );
//        alert( root_domain )
    }
    catch( x ) { }
    
    
    
    $( "#tabs" ).tabs(
        {
            beforeActivate: function( event, ui ) 
            {
                if( ui.newPanel[0].id == "tabs-all" ) {
                    
                    //if( all_domains_data.length == 0 ) refreshAllDomains();
                }
                if( ui.newPanel[0].id == "tabs-batch" ) {
                    
                    try
                    {
                        my_accounts = web3.eth.accounts;      

                        $("#batch_claim_my_address").empty();

                        for( var i = 0; i < my_accounts.length; i++ )
                        $("#batch_claim_my_address")
                            .append( $("<option>").val( my_accounts[i] ).text( 
                                no0x(my_accounts[i]) + 
                                " (" + formatEther( web3.eth.getBalance( my_accounts[i] ), "ETH" ) + ")"                                            
                            ) );        

                        lua = Cookies.get('etherid_last_used_address'); 
                        if( lua ) $("#batch_claim_my_address").val( lua )
                    }
                    catch( x ) 
                    {
                        swal("Web3 Error!", "Cannot connect to the Ethereum network. Please install and run an Ethereum client. \n(" + x + ")", "error" ) 
                    }                
                }
            }    
        }
    );    
    
    
    $("input#search_domain").keyup(function( event ) {
        if( event.keyCode == 13 ) $("#btn_search_domain").click()
    });
    

    $("#btn_all_refresh").click( function() { refreshAllDomains(); } );
    $("#btn_all_cancel").click( function() { all_domains_cancel = true; } );
    
    
    $("#btn_batch_prolong").click( function() { 
        batch_domain_list = []
        
        list = $("#batch_list").val();
        res = list.split(/[\s\,;\t\"\']+/);
        
        for( var i = 0; i < res.length; i++ )
        {
            n = res[i].trim();
            if( n == "" ) continue;
            
            batch_domain_list.push( n );
            
        }
        
        if( batch_domain_list.length == 0 ) {
            swal("List Error!", "Cannot recognize any valid names in the list", "error" ) 
            return;
        }       

        swal({   
            title: "Are you sure?",   
            text: "You are about to prolong " + batch_domain_list.length + 
                    " domains."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, prolong!",
            closeOnConfirm: true,    
            },
            function(isConfirm){   
                batch_progress.setText( "");
                batch_progress.animate( 0 );
                batch_domain_n = 0;
                batch_domain_process = "prolong";
                $("#batch_title").text( "Prolonging in progress...")
            
            
                
                $('#btn_batch_claim').prop('disabled',true );                
                $('#btn_batch_price').prop('disabled',true );                
                $('#btn_batch_prolong').prop('disabled',true );                
                $('#btn_batch_domain_cancel').prop('disabled',false );                
                batch_domain_cancel = false;
                batch_is_active = true;
            
                setTimeout( processBatch, BATCH_PROCESS_TIMEOUT);          
            }
        );        
        
    });
    
    $("#btn_batch_price").click( function() { 
        batch_domain_list = []
        
        list = $("#batch_list").val();
        res = list.split(/[\s\,;\t\"\']+/);
        
        for( var i = 0; i < res.length; i++ )
        {
            n = res[i].trim();
            if( n == "" ) continue;
            
            batch_domain_list.push( n );
            
        }
        
        if( batch_domain_list.length == 0 ) {
            swal("List Error!", "Cannot recognize any valid names in the list", "error" ) 
            return;
        }
        
        price_in_eth = $("#batch_price").val()
        batch_price = web3.toWei( new BigNumber( price_in_eth ), "ether" );
            

        swal({   
            title: "Are you sure?",   
            text: "You are about to set price for " + batch_domain_list.length + 
                    " domains to " + formatEther( batch_price, "ETH") + "."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, set price!",
            closeOnConfirm: true,    
            },
            function(isConfirm){   
                batch_progress.setText( "");
                batch_progress.animate( 0 );
                batch_domain_n = 0;
                batch_domain_process = "price";
                $("#batch_title").text( "Pricing in progress...")
            
            
                
                $('#btn_batch_claim').prop('disabled',true );                
                $('#btn_batch_price').prop('disabled',true );                
                $('#btn_batch_prolong').prop('disabled',true );                
                $('#btn_batch_domain_cancel').prop('disabled',false );                
                batch_domain_cancel = false;
                batch_is_active = true;
            
                setTimeout( processBatch, BATCH_PROCESS_TIMEOUT);          
            }
        );        
        
    });
    
    
    $("#btn_download_ascii").click( function() { 
        var csv = "";
        
        for( var i = 0; i < all_domains_data.length; i++ )
        {
            csv += all_domains_data[i].name() + "\n";
        }
        
        var downloadLink = document.createElement("a");
        var blob = new Blob([ csv ] );
        var url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.target = "names.csv";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
        
    $("#btn_download_hex").click( function() { 
        var csv = "";
        
        for( var i = 0; i < all_domains_data.length; i++ )
        {
            csv += all_domains_data[i].name_hex() + "\n";
        }
        
        var downloadLink = document.createElement("a");
        var blob = new Blob([ csv ] );
        var url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.target = "hex.csv";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);        
    });
        
    $("#btn_download_all").click( function() { 
        
        swal({   
            title: "Are you sure?",   
            text: "Listing all the registered domains is a long operation. It will takes several minutes."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, start!",
            closeOnConfirm: true,    
            },
            function(isConfirm){   
                var csv = "NAME,NAMEHEX,OWNER,PRICE,EXPIRES,DAYS_LEFT,TRANSFER,STATUS \n";

                try
                {
                    var nn = contract.root_domain();

                    while( new BigNumber( nn ) != 0 ) 
                    {
                        res = contract.getDomain( nn );

                        d = new DomainRecord( nn, res[0], res[1], res[2], res[3] );
                        nn = res[4];

                    
                        csv += "\"" + d.name().replace( "\'", "\'\'").replace( "\"", "\"\"") + "\",";
                        csv += d.name_hex() + ",";
                        csv += d.owner + ",";
                        csv += web3.fromWei( d.price, "ether" ) + ",";
                        csv += d.expires + ",";
                        csv += d.days() + ",";
                        csv += ( new BigNumber( d.transfer ) == 0 ? "" : d.transfer ) + ",";
                        csv += d.stat() + "\n";
                    }
                }
                catch( x )
                {
                    hex = web3.toHex( all_domains_curent_domain );
                    swal("Web3 Error!", "Problem with domain: " + hex + " (" + x + ")", "error" ) 

                    $("#all_domain_progress").hide();
                    $('#btn_all_refresh').prop('disabled', false );  

                    return;
                }
            
                var downloadLink = document.createElement("a");
                var blob = new Blob([ csv ] );
                var url = URL.createObjectURL(blob);
                downloadLink.href = url;
                downloadLink.target = "all.csv";
                downloadLink.download = "all.csv";

                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);        
            }
        );        
    });
    
        
    $("#btn_batch_claim").click( function() { 
        
        list = $("#batch_list").val();
        res = list.split(/[\s\,;\t\"\']+/);
        
        uppercase = $('#uppercase').is(":checked")
        lowercase = $('#lowercase').is(":checked")
        
        
        batch_domain_list = []
        
        for( var i = 0; i < res.length; i++ )
        {
            n = res[i].trim();
            if( n == "" ) continue;
            
            batch_domain_list.push( n );
            
            if( n.substring( 0, 2 ) != "0x" ) 
            {
                if( uppercase )
                {
                    ucn = n.toUpperCase();
                    if( ucn != n ) batch_domain_list.push( ucn );
                }

                if( lowercase )
                {
                    lcn = n.toLowerCase();
                    if( lcn != n && lcn != ucn ) batch_domain_list.push( lcn );
                }
            }
        }
        
        if( batch_domain_list.length == 0 ) {
            swal("List Error!", "Cannot recognize any valid names in the list", "error" ) 
            return;
        }       
        
        swal({   
            title: "Are you sure?",   
            text: "You are about to claim " + batch_domain_list.length + 
                    " domains."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, claim!",
            closeOnConfirm: true,    
            },
            function(isConfirm){   
                batch_progress.setText( "");
                batch_progress.animate( 0 );
                batch_domain_process = "claim"
                
                $("#batch_title").text( "Claiming in progress...")
                
                batch_domain_wallet_to_use = $("#batch_claim_my_address").val()   
                Cookies.set('etherid_last_used_address', batch_domain_wallet_to_use ); 

                batch_domain_n = 0;
            
                
                $('#btn_batch_claim').prop('disabled',true );                
                $('#btn_batch_prolong').prop('disabled',true );                
                $('#btn_batch_price').prop('disabled',true );                
                $('#btn_batch_domain_cancel').prop('disabled',false );                
                batch_domain_cancel = false;
                batch_is_active = true;

                setTimeout( processBatch, BATCH_PROCESS_TIMEOUT);          
            }
        );
        
        
            
    } );
    
    $("#btn_batch_domain_cancel").click( function() { 
        batch_domain_cancel = true;
    } );
    
    
    $("#btn_search_domain").click( function() {
        s = $("input#search_domain").val()
        hex = ""
        ascii = ""

        if( s.substring( 0, 2 ) === "0x" ) 
        {    
            a = hexToArray( s )
            hex = arrayToHex( a )    
            hex = "0x" + hex.substr( 0, 64 )
            ascii = ""
            try {
                ascii = utf8.decode( toAscii( hex ) ) 
            }
            catch( x ) {}
        }
        else
        {
            utf = utf8.encode( s ).slice(0, 32);
            hex = "0x" + asciiToHex( utf )    
            try {
                ascii = utf8.decode( toAscii( hex ) ) 
            }
            catch( x ) {}
        }
        
        
        hex = remove0Prefix( hex )
        current_domain = new BigNumber( hex );

        updateDomainPage()
        
        
        $("#domain_hex").text( hex );
        $("#domain_ascii").text( ascii );

    })
    
    $(".btn_act_cancel").each( function() {
        $(this).click( function() {
            openActionPan( "home"); 
        })
    });
    

    
    $("#btn_act_claim").click( function() {
        openActionPan( "claim"); 
        
        try
        {
            my_accounts = web3.eth.accounts;      

            $("#act_claim_my_address").empty();

            for( var i = 0; i < my_accounts.length; i++ )
            $("#act_claim_my_address")
                .append( $("<option>").val( my_accounts[i] ).text( 
                    no0x(my_accounts[i]) + 
                    " (" + formatEther( web3.eth.getBalance( my_accounts[i] ), "ETH" ) + ")"                                            
                ) );        

            lua = Cookies.get('etherid_last_used_address'); 
            if( lua ) $("#act_claim_my_address").val( lua )
        }
        catch( x ) 
        {
            swal("Web3 Error!", "Cannot connect to the Ethereum network. Please install and run an Ethereum client. \n(" + x + ")", "error" ) 
        }
        
    })

    $("#btn_act_claim_domain").click( function() {
        
        expires = new BigNumber( $("#action_claim #expires").val() )
        
        if( expires < 1000 ) expires = 1000;
        if( expires > 2000000 ) expires = 2000000;
        
        
        swal({   
            title: "Are you sure?",   
            text: "You are about to claim the domain (" + web3.toHex( current_domain ) + 
                    " ). Your ownership will expire in " + expires + " blocks."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, claim!",
            closeOnConfirm: false,    
            },
            function(isConfirm){   
                try 
                {
                    wallet_to_use = $("#act_claim_my_address").val()       
                    
                    Cookies.set('etherid_last_used_address', wallet_to_use ); 
                    
                    gp = web3.eth.gasPrice;
                    
                    contract = getContract();
                    
                    var params = {
                                gas: 200000,
                                from : wallet_to_use,
                                value: 0
                            };

                    //tx = web3.eth.sendTransaction( params );
                    contract.changeDomain.sendTransaction( current_domain, expires, 0, 0, params );
                    
                }
                catch( err )
                {
                    swal( "Error", err, "error" )                
                    return;
                }            
                swal("Your claim is complete!", 
                     "Please wait for several minutes while the Ethereum network processes the transaction.", "success");               
                openActionPan( "home"); 
            }
        )
    })

    $("#btn_act_buy").click( function() {
        openActionPan( "buy"); 
        
        my_accounts = web3.eth.accounts;      
        
        $("#act_buy_my_address").empty();
        
        for( var i = 0; i < my_accounts.length; i++ )
        $("#act_buy_my_address")
            .append( $("<option>").val( my_accounts[i] ).text( 
                no0x(my_accounts[i]) + 
                " (" + formatEther( web3.eth.getBalance( my_accounts[i] ), "ETH" ) + ")"                                            
            ) );        
        
        lua = Cookies.get('etherid_last_used_address'); 
        if( lua ) $("#act_buy_my_address").val( lua )
        
    })

    $("#btn_act_buy_domain").click( function() {
        
        expires = new BigNumber( $("#action_buy #expires").val() )
        
        if( expires < 1000 ) expires = 1000;
        if( expires > 2000000 ) expires = 2000000;
        
        
        swal({   
            title: "Are you sure?",   
            text: "You are about to buy the domain (" + current_domain.domain + 
                    " ) for " + formatEther( current_domain.price, "ETH") + ". Your ownership will expire in " + expires + " blocks."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, buy!",
            closeOnConfirm: false,    
            },
            function(isConfirm){   
                try 
                {
                    wallet_to_use = $("#act_buy_my_address").val()       
                    
                    Cookies.set('etherid_last_used_address', wallet_to_use ); 
                    
                    gp = web3.eth.gasPrice;
                    
                    var params = {
                                gas: 200000,
                                gasPrice : gp,
                                from : wallet_to_use,
                                to: ETHERID_CONTRACT,
                                value: current_domain.price,
                                data: makeData( [
                                    "domain",
                                    new BigNumber( current_domain.domain ),
                                    expires,
                                    0,
                                    0 
                                ] )
                            };

                    tx = web3.eth.sendTransaction( params );
                }
                catch( err )
                {
                    swal( "Error", err, "error" )                
                    return;
                }            
                swal("You bought the domain!", 
                     "Please wait for several minutes while the Ethereum network processes the transaction." +
                     " If for some reason the ownership will not transfer, for example is you do not have enough funds on your address, then all your spent amount will be transfered back to you.", "success");               
                openActionPan( "home"); 
            }
        )
    })

    $("#btn_act_prolong").click( function() {
        openActionPan( "prolong"); 
    })
    
    $("#btn_act_prolong_domain").click( function() {
        
        expires = new BigNumber( $("#action_prolong #expires").val() )
        
        if( expires < 1000 ) expires = 1000;
        if( expires > 2000000 ) expires = 2000000;
        
        
        swal({   
            title: "Are you sure?",   
            text: "You are about to prolong domain (" + current_domain.domain + 
                    " ). Your ownership will expire in " + expires + " blocks."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, prolong!",
            closeOnConfirm: false,    
            },
            function(isConfirm){   
                try 
                {
                    wallet_to_use = domain.owner;
                    
                    var params = {
                                gas: 200000,
                                from : wallet_to_use,
                                value: 0
                            };

                    //tx = web3.eth.sendTransaction( params );
                    
                    getContract().changeDomain.sendTransaction
                    (
                        current_domain, 
                        expires, 
                        domain.price, 
                        domain.transfer, 
                        params 
                    );
                    
                }
                catch( err )
                {
                    swal( "Error", err, "error" )                
                    return;
                }            
                swal("Your ownership extended!", 
                     "Please wait for several minutes while the Ethereum network processes the transaction.", "success");
                openActionPan( "home"); 
            }

        )
    })

    $("#btn_act_sell").click( function() {
        openActionPan( "sell"); 
    })
    
    $("#btn_act_sell_domain").click( function() {
        
        price_in_eth = $("#action_sell #price").val()
        price = web3.toWei( new BigNumber( price_in_eth ), "ether" );
        
        
        expires = new BigNumber( $("#action_sell #expires").val() )
        
        if( expires < 1000 ) expires = 1000;
        if( expires > 2000000 ) expires = 2000000;
        
        
        swal({   
            title: "Are you sure?",   
            text: "You are about to set price for domain (" + current_domain.domain + 
                    " ). This will allow anyone to pay you " + formatEther( price, "ETH" ) + " and take the ownership for the domain."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, set price!",
            closeOnConfirm: false,    
            },
            function(isConfirm){   
                try 
                {
                    wallet_to_use = domain.owner;
                    
                    var params = {
                                gas: 200000,
                                from : wallet_to_use,
                                value: 0
                            };

                    //tx = web3.eth.sendTransaction( params );
                    
                    getContract().changeDomain.sendTransaction
                    (
                        current_domain, 
                        expires, 
                        price, 
                        domain.transfer, 
                        params 
                    );                    
                    
                    
                }
                catch( err )
                {
                    swal( "Error", err, "error" )                
                    return;
                }            
                swal("Price is set!", 
                     "Please wait for several minutes while the Ethereum network processes the transaction.", "success");
                openActionPan( "home"); 
            }

        )
    })
    
    $("#btn_act_transfer").click( function() {
        openActionPan( "transfer"); 
    })
    
    $("#btn_act_transfer_domain").click( function() {
        
        transfer = $("#action_transfer #transfer").val()
        if( transfer.substring( 0, 2 ) != "0x" ) 
        {    
            transfer = "0x" + transfer;
        }
        
        expires = new BigNumber( $("#action_transfer #expires").val() )
        
        if( expires < 1000 ) expires = 1000;
        if( expires > 2000000 ) expires = 2000000;        
        
        swal({   
            title: "Are you sure?",   
            text: "You are about to set transfer address to " + transfer + 
                    ". The owner of this address and only him or her will be able to pay " + 
                    "the price and take the ownership of teh domain."  ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, set transfer address!",
            closeOnConfirm: false,    
            },
            function(isConfirm){   
                try 
                {
                    wallet_to_use = domain.owner;
                    
                    var params = {
                                gas: 200000,
                                from : wallet_to_use,
                                value: 0
                            };

                    getContract().changeDomain.sendTransaction
                    (
                        current_domain, 
                        expires, 
                        domain.price, 
                        transfer, 
                        params 
                    );                                  
                }
                catch( err )
                {
                    swal( "Error", err, "error" )                
                    return;
                }            
                swal("Transfer is done!", 
                     "Please wait for several minutes while the Ethereum network processes the transaction.", "success");
                openActionPan( "home"); 
            }

        )
    })
    
    
    $("#btn_act_new_id").click( function() {
        
        swal(
        {   
            title: "New ID",   
            text: "Please specify new ID name. You can use 0xNNN notation to enter a hexadecimal value.",   
            type: "input",   
            showCancelButton: true,   
            closeOnConfirm: false,   
            animation: "slide-from-top",   
            inputPlaceholder: "ID Name" 
        }, 
        function(inputValue)
        {   
            if (inputValue === false) return false;      
            if (inputValue === "") 
            {     
                swal.showInputError("You need to specify ID name!");     
                return false   
            }      
            
            current_id = ""
            if( inputValue.substring( 0, 2 ) === "0x" ) 
            {    
                a = hexToArray( inputValue )
                current_id = arrayToHex( a )    
                current_id = "0x" + current_id.substr( 0, 64 )
            }
            else
            {
                utf = utf8.encode( inputValue ).slice(0, 32);
                current_id = "0x" + asciiToHex( utf )    
            }
            
            swal(
            {   
                title: "ID Value",   
                text: "Please specify the value. You can use 0xNNN notation to enter a hexadecimal value.",   
                type: "input",   
                showCancelButton: true,   
                closeOnConfirm: false,   
                animation: "slide-from-top",   
                inputPlaceholder: "0" 
            }, 
            function(inputValue)
            {   
                if (inputValue === false) return false;      
                if (inputValue === "") 
                {     
                    swal.showInputError("You need to specify value!");     
                    return false   
                }      

                current_value = ""
                if( inputValue.substring( 0, 2 ) === "0x" ) 
                {    
                    a = hexToArray( inputValue )
                    current_value = arrayToHex( a )    
                    current_value = "0x" + current_value.substr( 0, 64 )
                }
                else
                {
                    utf = utf8.encode( inputValue ).slice(0, 32);
                    current_value = "0x" + asciiToHex( utf )    
                }

                swal({   
                    title: "Are you sure?",   
                    text: "You are about to add new ID " + current_id + 
                            " = "  + current_value ,   
                    type: "warning",   
                    showCancelButton: true,   
                    confirmButtonText: "Yes, add ID!",
                    closeOnConfirm: false,    
                    },
                    function(isConfirm){   
                        try 
                        {
                            wallet_to_use = domain.owner;

                            var params = {
                                        gas: 200000,
                                        from : wallet_to_use,
                                        value: 0
                                    };

                            getContract().changeId.sendTransaction
                            (
                                current_domain, 
                                current_id, 
                                current_value, 
                                params 
                            );                             
                        }
                        catch( err )
                        {
                            swal( "Error", err, "error" )                
                            return;
                        }  
                        swal("ID created!", 
                             "Please wait for several minutes while the Ethereum network processes the transaction.", "success");
                    }
                )                
            });        
        });        
        
    })
    
    
} )

function no0x(a)
{
    if( a.substr( 0, 2 ) == "0x" ) { a = a.substr( 2 ); }
    return a;
}
 

function formatEther( v, t )
{
    n = new BigNumber( v );
    
    if( t == "ETH" )
    {
        //return n.div( ETH1 ).toNumber() + "Ξ"; 
        return ETH_SIGN + n.div( ETH1 ).toNumber(); 
    }

    if( t == "ETH2" )
    {
        //return n.div( ETH1 ).toNumber() + "Ξ"; 
        return ETH_SIGN + n.div( ETH1 ).toFixed( 2 ); 
    }
    
    if( n.e < 3 ) { return n + " wei"; }
    if( n.e < 6 ) { return n.div( new BigNumber( "1000" ) ) + " Kwei"; }
    if( n.e < 9 ) { return n.div( new BigNumber( "1000000" ) ) + " Mwei"; }
    if( n.e < 12 ) { return n.div( new BigNumber( "1000000000" ) ) + " Gwei"; }
    if( n.e < 15 ) { return n.div( new BigNumber( "1000000000000" ) ) + " szabo"; }
    if( n.e < 18 ) { return n.div( new BigNumber( "1000000000000000" ) ) + " finney"; }
    //if( n.e < 21 ) { return n.div( new BigNumber( "1000000000000000000" ) ) + " ether"; }
    return n.div( ETH1 ) + " ether"; 
}

function  openActionPan( pan )
{
    current_pan = $( ".action_pan:visible" ).fadeOut( 200, function() {
        $( "#action_" + pan ).fadeIn( 200 );
    });
    
    
}


function  updateDomainPage()
{
    hex = web3.toHex( current_domain );
    
    $("#domain_hex").text( hex );
    
    ascii = ""
    try {
        ascii = utf8.decode( toAscii( hex ) ) 
    }
    catch( x ) {}

    
    $("#domain_ascii").text( ascii );
    

    $("#domain_owner").text( "" );
    $("#domain_expires").text( "" );

    domain = {}
    
    try
    {
        contract = getContract();
        res = contract.getDomain( current_domain );
        
        domain = {
            owner : res[0], 
            expires: res[1], 
            price: res[2], 
            transfer: res[3], 
            next_domain: res[4], 
            root_id: res[5]
        }
        
        $("#domain_owner").text( new BigNumber(domain.owner) != 0 ? domain.owner : "NOT CLAIMED" );

        $("#domain_expires").text( domain.expires );
        var current_block = 0;
        if( domain.expires > 0 ) {
            current_block =  web3.eth.getBlock( "latest" ).number;        

            blocks_left = domain.expires - current_block

            if( blocks_left <= 0 ) $("#domain_expires").text( "EXPIRED" );
            else
            {
                $("#domain_expires").text( domain.expires + " (in " + blocks2time( blocks_left ) + ")");
            }
        }

        $("#domain_price").text( domain.owner ? ( domain.price > 0 ? formatEther( domain.price, "ETH" ) : "NOT FOR SALE" ) : "" ) ;
        $("#domain_transfer").text( new BigNumber( domain.transfer ) == 0 ? "" : domain.transfer );

        var my_accounts = []
        my_accounts = web3.eth.accounts;
    
        // Deturmine the status

        var available = new BigNumber( domain.owner ) == 0
        var on_sale = domain.price == undefined || domain.price == 0
        var expired = domain.expires < current_block
        var mine = false;
        if( !available ) {
            for( var i = 0; i < my_accounts.length; i++ )
            {
                if( new BigNumber( my_accounts[i] ).eq( new BigNumber( domain.owner ) ) ) 
                { 
                    mine = true; break; 
                }             
            }
        }

        var on_sale = domain.price > 0
        var forme = false;
        for( var i = 0; i < my_accounts.length; i++ )
        {
            if( new BigNumber( my_accounts[i] ).eq( new BigNumber( domain.transfer ) ) ) 
            { 
                forme = true; break; 
            }
        }

        $('#btn_act_claim').prop('disabled', !( expired || available ) );
        $('#btn_act_buy').prop('disabled', !( !mine && ( on_sale || forme ) ) );
    //    $('#btn_act_buy').prop('disabled', false ); //DEBUG ONLY
        $('#btn_act_prolong').prop('disabled', !mine );
        $('#btn_act_sell').prop('disabled', !mine );
        $('#btn_act_transfer').prop('disabled', !mine );
        $('#btn_act_new_id').prop('disabled', !mine );


        status = "Unknown"

        if( on_sale ) status = "On Sale"
        if( available ) status = "Available"
        if( expired ) status = "Expired"
        if( mine ) status = "My Domain"


        $('#domain_status').text( status )
        
        // read all the IDS
//        $("table#ids").find("tr:gt(0)").remove();
//        $("table#ids tr:gt(0)").remove();
//        $('table#ids > tbody:last').children( 'tr:not(:first)' ).remove();
        $("table#ids > tbody").empty();
    
        id = domain.root_id
        
        while( id != 0 ) {
            id_res = contract.getId( current_domain, id ) 
            
            
            id_hex = web3.toHex( id );
            id_ascii = ""
            try {
                id_ascii = utf8.decode( toAscii( id_hex ) ) 
            }
            catch( x ) {}            
            
            val_hex = web3.toHex( id_res[0] );
            val_ascii = ""
            try {
                val_ascii = utf8.decode( toAscii( val_hex ) ) 
            }
            catch( x ) {}            
            
            $('table#ids > tbody').append(
                $("<tr>")
                    .append( $("<td>").text( id_ascii ) )
                    .append( $("<td>").text( id_hex ) )
                    .append( $("<td>").text( val_ascii ) )
                    .append( $("<td>").text( val_hex ) )
                    .append
                    ( 
                        $("<td>")
                        .append( $("<button>").attr( "id", id_hex).text( "Edit" )
                                .attr( "onclick", "editId()"))
                        .append( $("<button>").attr( "id", id_hex).text( "Delete" )
                                .attr( "onclick", "deleteId()"))
                    )
            );         
            
            id = id_res[1];
        }
    }
    catch( x )
    {
            swal("Web3 Error!", "Cannot connect to the Ethereum network. Please install and run an Ethereum client. \n(" + x + ")", "error")
        return;
    }
}

function editId( ) {
    current_id =  event.srcElement.id
    
    swal(
    {   
        title: "ID Value",   
        text: "Please specify new value. You can use 0xNNN notation to enter a hexadecimal value.",   
        type: "input",   
        showCancelButton: true,   
        closeOnConfirm: false,   
        animation: "slide-from-top",   
        inputPlaceholder: "0" 
    }, 
    function(inputValue)
    {   
        if (inputValue === false) return false;      
        if (inputValue === "") 
        {     
            swal.showInputError("You need to specify value!");     
            return false   
        }      

        current_value = ""
        if( inputValue.substring( 0, 2 ) === "0x" ) 
        {    
            a = hexToArray( inputValue )
            current_value = arrayToHex( a )    
            current_value = "0x" + current_value.substr( 0, 64 )
        }
        else
        {
            utf = utf8.encode( inputValue ).slice(0, 32);
            current_value = "0x" + asciiToHex( utf )    
        }

        swal({   
            title: "Are you sure?",   
            text: "You are about to change value for ID " + current_id + 
                    " = "  + current_value ,   
            type: "warning",   
            showCancelButton: true,   
            confirmButtonText: "Yes, change ID!",
            closeOnConfirm: false,    
            },
            function(isConfirm){   
                try 
                {
                    wallet_to_use = domain.owner;

                    var params = {
                                gas: 200000,
                                from : wallet_to_use,
                                value: 0
                            };

                    getContract().changeId.sendTransaction
                    (
                        current_domain, 
                        current_id, 
                        current_value, 
                        params 
                    );                             
                }
                catch( err )
                {
                    swal( "Error", err, "error" )                
                    return;
                }  
                swal("ID changed!", 
                     "Please wait for several minutes while the Ethereum network processes the transaction.", "success");
            }
        )                
    });        
}

function deleteId( ) {
    current_id =  event.srcElement.id

    swal({   
    title: "Are you sure?",   
    text: "You are about to delete ID " + current_id,   
    type: "warning",   
    showCancelButton: true,   
    confirmButtonText: "Yes, delete ID!",
    closeOnConfirm: false,    
    },
    function(isConfirm){   
        try 
        {
            wallet_to_use = domain.owner;

            var params = {
                        gas: 200000,
                        from : wallet_to_use,
                        value: 0
                    };

            getContract().changeId.sendTransaction
            (
                current_domain, 
                current_id, 
                0, 
                params 
            );                             
        }
        catch( err )
        {
            swal( "Error", err, "error" )                
            return;
        }  
        swal("ID deleted!", 
             "Please wait for several minutes while the Ethereum network processes the transaction.", "success");
    }
)                


}

function areHexEq( a, b )
{
    if( a == undefined ) return false
    if( b == undefined ) return false
    
    var aa = a;
    if( aa.substr( 0, 2 ) == "0x" ) aa = aa.substr( 2 );
    while( aa.charAt( 0 ) == '0' ) { aa = aa.substr( 1 ); }

    var bb = b;
    if( bb.substr( 0, 2 ) == "0x" ) bb = bb.substr( 2 );
    while( bb.charAt( 0 ) == '0' ) { bb = bb.substr( 1 ); }
    
    return aa == bb;
}
      
    
function toAscii(hex) { //fixed version
// Find termination
    var str = "";
    var i = 0, l = hex.length;
    if (hex.substring(0, 2) === '0x') {
        i = 2;
    }
    for (; i < l; i+=2) {
        var code = parseInt(hex.substr(i, 2), 16);
        if( code == 0 ) break;        
        str += String.fromCharCode(code);
    }

    return str;
};

function arrayToHex( arr ) {
    var str ='';
    for(var i = 0; i < arr.length ; i++) {
        var n = arr[i] & 0xFF;
        str += (( n < 16) ? "0":"") + n.toString(16);
    }
    return str;
}   

function asciiToHex( arr ) {
    var str ='';
    for(var i = 0; i < arr.length ; i++) {
        var n = arr.charCodeAt(i);
        str += (( n < 16) ? "0":"") + n.toString(16);
    }
    return str;
}   
    
function remove0Prefix( s )
{
    if( s.substr( 0, 2 ) == "0x" ) { s = s.substr( 2 ); }
    
    while( s.length > 2 && s.substr( 0, 2 ) == "00" ) { s = s.substr( 2 ); }
    
    return "0x" + s
    
}

function remove0Postfix( s )
{
    if( s.substr( 0, 2 ) == "0x" ) { s = s.substr( 2 ); }
    
    while( s.length > 2 && s.substr( s.length - 2 , 2 ) == "00" ) { s = s.substr( 0, s.length - 2 ); }
    
    return "0x" + s
    
}

function hexToArray( s )
{
    var r =  [];
    
    if( s.substr( 0, 2 ) == "0x" ) { s = s.substr( 2 ); }
    
    if( s.length & 1 ) s = "0" + s;
    
    for (var i = 0; i < s.length; i += 2) {
        r.push( parseInt( s.substr(i, 2) ,16) );
    }        
    
    return r;
}

function makeData( arr )
{
    var d = "";
    
    for( var i = 0; i < arr.length; i++ )
    {
        var n = arr[i];
        var nv = "";
        
//        log( "### " + n + " type: " + ( typeof n ) + " isBigNumber: " + (n instanceof BigNumber) ); 
        
        
        if( typeof n == "string" ) 
        {
            if( n.length > 32 )
            {
                logError( "makeDir: too long string: " + n );
                return "";
            }
            
            for( var j = 0; j < n.length; j++ )
            {
                var c = n.charCodeAt( j ) & 0xFF;
                nv +=(( c < 16) ? "0":"") + c.toString(16);
            }
            
            while( nv.length < 32 * 2 ) { nv += "00"; }
        }
        
        if( typeof n == "number"  || n instanceof BigNumber )
        {
            nv = web3.toHex( n );
            if( nv.indexOf( '0x' ) == 0 ) nv = nv.substr( 2 );
            if( nv.indexOf( '-0x' ) == 0 ) nv = nv.substr( 3 );
            
            if( nv.length % 2 ) { nv = "0" + nv; }

            if( nv.length > 32 * 2 )
            {
                logError( "makeDir: too big number: " + n );
                return "";
            }
            while( nv.length < 32 * 2 ) { nv = "00" + nv; }
        }
        
        if( typeof n == "object" && n.constructor === int256 )
        {
            nv = n.toHex();
        }
        
        
        if( $.isArray( n ) )
        {
            nv = arrayToHex( n );
            var needed_length = Math.floor( ( nv.length + 63 ) / 64 ) * 64;
            while( nv.length < needed_length ) { nv += "00"; }
        }
        
        if( typeof n == "object" && n.constructor === Int8Array )
        {
            nv = arrayToHex( n );
            var needed_length = Math.floor( ( nv.length + 63 ) / 64 ) * 64;
            while( nv.length < needed_length ) { nv += "00"; }
        }
        
        if( nv.indexOf( '0x' ) == 0 ) nv = nv.substr( 2 );
        if( nv.indexOf( '-0x' ) == 0 ) nv = nv.substr( 3 );
        d += nv;
    }
    
    //return "0x" + d;
    return d;
}

function blocks2time( n )
{
    secs = n * SECONDS_PER_BLOCK;
    hours = Math.floor( secs / 60 / 60 )
    days = Math.floor( hours / 24 )
    
    if( days > 0 ) return days + " days";
    if( hours > 0 ) return hours + " hours";
    if( secs > 0 ) return secs + " secs";
 
    return ""
}

function DomainRecord ( domain, owner, expires, price, transfer ) {
    this.domain = domain;
    this.owner = owner;
    this.expires = expires;
    this.price = price;
    this.transfer = transfer;
 
    this.name = function () {
        
        hex = web3.toHex( this.domain );
        
        ascii = ""
        try {
            ascii = utf8.decode( toAscii( hex ) ) 
        }
        catch( x ) {}

        return ascii;
    }

    this.name_hex = function () {
        return web3.toHex( this.domain );
    }

    this.days = function () {
        
        bks = this.expires - current_block;
        
        return Math.floor( bks * SECONDS_PER_BLOCK / 60 / 60 / 24 ); 
    }

    this.price_fine = function () {
        
        if( this.price == 0 ) return "";
        return formatEther( this.price, "ETH");
    }

    this.stat = function () {
        
        if( this.expires <= current_block ) return "EXPIRED";
        if( new BigNumber( this.price ) > 0  ) return "FOR SALE";
        return "";
    }

};


function refreshAllDomainsPortion() {
    var this_portion_n = 0;

    try
    {
        var n_domains =  contract.n_domains();
        
        while( new BigNumber( all_domains_curent_domain ) != 0 ) 
        {
            res = contract.getDomain( all_domains_curent_domain );
        
            d = new DomainRecord( all_domains_curent_domain, res[0], res[1], res[2], res[3] );
            all_domains_curent_domain = res[4];

            all_domains_n++;

            this_portion_n++;
            if( this_portion_n > ALL_DOMAINS_SEARCH_PORTION ) {
                setTimeout( refreshAllDomainsPortion, ALL_DOMAINS_TIMEOUT);
                
                update_list_progress.set( all_domains_n / n_domains ); 
                update_list_progress.setText( all_domains_n + "/" + n_domains ); 
                return;
            }
            
            if( only_mine )
            {
                var mine = false;
                for( var i = 0; i < my_accounts.length; i++ )
                {
                    if( new BigNumber( my_accounts[i] ).eq( new BigNumber( d.owner ) ) ) 
                    { 
                        mine = true; break; 
                    }
                }                    
                if( !mine ) continue;
            }
            
            if( only_expired && ( d.expires >= current_block ) ) continue;
            if( only_for_sale && d.price == 0 ) continue;   
            
            var ok = true;

            if( all_domain_pattern != "" ) {
                ok = false;
                
                hex = web3.toHex( d.domain );
                
                if( hex.match( all_domain_pattern ) ) { ok = true }
                else
                {
                    ascii = ""
                    try {
                        ascii = utf8.decode( toAscii( hex ) ) 
                    }
                    catch( x ) {}
                    if( ascii.match( all_domain_pattern ) ) { ok = true }
                }
            }
            
            if( ok ) all_domains_data.push( d ); 
            
        }
    }
    catch( x )
    {
        hex = web3.toHex( all_domains_curent_domain );
        swal("Web3 Error!", "Problem with domain: " + hex + " (" + x + ")", "error" ) 
        
        $("#all_domain_progress").hide();
        $('#btn_all_refresh').prop('disabled', false );  
        
        return;
    }
    
    update_list_progress.set( 1 ); 

    //if( all_domains_table ) all_domains_table.destroy();
    
    all_domains_table = $('#all_domains').DataTable( {
        destroy: true,
        data : all_domains_data,
        columns: [
            { data: 'name', title: 'Name' },
            { data: 'name_hex', title: 'Name(HEX)' },
            { data: 'owner', title: "Owner" },
            { data: 'expires', title: "Expires" },
            { data: 'days', title: "Days Left" },
            { data: 'price_fine' },
            { data: 'stat', title: "Status" },
        ],
        select: {
            style:    'os',
            selector: 'td:first-child',
            blurable: true
        }
    } );        
    
    
    $('#all_domains tbody').on('click', 'tr', function () {
        var data = all_domains_table.row( this ).data();
        
        current_domain = data.domain;
        updateDomainPage();
        $("#tabs").tabs("option", "active", 1);
        
    } );
    
    $('#btn_all_refresh').prop('disabled', false );  
    $('#btn_download_ascii').prop('disabled', all_domains_data == 0 );  
    $('#btn_download_hex').prop('disabled', all_domains_data == 0 );  
    $("#all_domain_progress").hide();
    
}

function refreshAllDomains()
{
    all_domains_cancel = false;
    
    try
    {
        current_block =  web3.eth.getBlock( "latest" ).number;      
        my_accounts = []
        my_accounts = web3.eth.accounts;
        
        all_domains_curent_domain = contract.root_domain();
        
        all_domains_data = []
        all_domains_n = 0;

        only_mine = $('#only_mine').is(":checked")
        only_expired = $('#only_expired').is(":checked")
        only_for_sale = $('#only_for_sale').is(":checked")
        all_domain_pattern = $("#all_domains_pattern").val();

        all_domains_curent_domain = contract.root_domain();
        all_domains_n = 0;

        $("#all_domain_progress").show();
        update_list_progress.set( 0 ); 
        update_list_progress.setText( "...Updating");
    }
    catch( x )
    {
        swal("Web3 Error!", "Cannot connect to the Ethereum network. Please install and run an Ethereum client. \n(" + x + ")", "error" ) 
        return;
    }
    
    $('#btn_all_refresh').prop('disabled', true );  
    setTimeout( refreshAllDomainsPortion, ALL_DOMAINS_TIMEOUT);
    
}
    
    
