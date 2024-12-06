frappe.ui.form.on("Item", {
  
  
    efris_currency: function(frm) {
        let efris_currency = frm.doc.efris_currency;
        if (efris_currency) {
            console.log(`Currency is ${efris_currency}`);
            
            // Using a Frappe.call to handle the asynchronous get_value call
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Currency",
                    fieldname: "efris_currency_code",
                    filters: { name: efris_currency }
                },
                callback: function(r) {
                    if (r.message) {
                        let efris_code = r.message.efris_currency_code;
                        console.log(`The Efris Currency Code is ${efris_code}`);
                        
                        if (!efris_code) {
                            frappe.throw("The Selected Currency is an Invalid Efris Currency");
                        } else {
                            console.log(`The Currency Code is ${efris_code}`);
                        }
                    } else {
                        frappe.throw("Failed to fetch Efris Currency Code.");
                    }
                }
            });
        }
    },
    efris_commodity_code: function(frm){
        set_item_tax_template(frm)
        frm.refresh_field("taxes");
        frm.refresh_field("efris_commodity_code")
    },
    validate:function(frm){
        set_item_tax_template(frm)
        frm.refresh_field("taxes")
    },
    item_code:function(frm){
        // console.log(`On Item Code Change...`)
        let item_code = frm.doc.item_code;
        // console.log(`Item Code ${item_code} is ${item_code.length} characters long`)
        if (item_code && item_code !== ''){
            item_code = item_code.trim()
            // console.log(`Trimmed Item Code :${item_code} is ${item_code.length} characters long`)
            frm.set_value('item_code',item_code);
            frm.refresh_field('item_code');
        }
    }
});
function set_item_tax_template(frm){
   
        console.log(`EFRIS Commodity Code Added...`);
        let efris_commodity_code = frm.doc.efris_commodity_code;
        if (efris_commodity_code) {
            console.log(`The EFRIS commodity code is ${efris_commodity_code}`);
            
            // Fetch the E Tax Category from the Efris Commodity Code
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Efris Commodity Code',
                    fieldname: "e_tax_category",
                    filters: { name: efris_commodity_code }
                },
                callback: function(r) {
                    if (r.message) {
                        let e_tax_category = r.message.e_tax_category;
                        console.log(`The E Tax Category on ${efris_commodity_code} is ${e_tax_category}`);
                        
                        if (e_tax_category) {
                            console.log(`E Tax Category is ${e_tax_category}`);
                            const company = frm.doc.e_company;
                            console.log(`Item E Company is ${company}`);
                            
                            // Fetch the Item Tax Template based on E Tax Category and Company
                            frappe.call({
                                method: 'uganda_compliance.efris.api_classes.e_goods_services.get_item_tax_template',
                                args: {
                                    company: company,
                                    e_tax_category: e_tax_category
                                },
                                callback: function(r) {
                                    if (r.message && r.message.length > 0) {
                                        
                                          frm.clear_table("taxes");
                                          let row = frm.add_child("taxes");
                                          row.item_tax_template = r.message
                                          frm.refresh_field('taxes');
                                        } else {
                                            frappe.msgprint('No matching Item Tax Template found.');
                                    }
                                       
                                        
                            }

                            });
                        }
                    } else {
                        frappe.throw("Failed to fetch E Tax Category from the EFRIS Commodity Code.");
                    }
                }
            });
        }
    }

       
frappe.ui.form.on('Item', {
    after_save: function(frm) {
        console.log("After Save is called...")
        frappe.call({
            method: 'uganda_compliance.efris.api_classes.e_goods_services.create_item_prices',
            args: {
                item_code: frm.doc.item_code,
                uoms: frm.doc.uoms,
                currency: frm.doc.efris_currency
            },
            callback: function(r) {
                if (r.message) {
                    frappe.msgprint(r.message);
                    console.log(r.message.currency)
                }
            }
        });
    },
    purchase_uom: function(frm) {
        if (frm.doc.purchase_uom) {
            console.log(`Purchase UOM listener called ...`);
            let purchase_uom = frm.doc.purchase_uom;
            console.log(`Purchase UOM is ${purchase_uom}`);

            // Check if the purchase_uom exists in the UOMs table
            let uom_exists = frm.doc.uoms.some(row => row.uom === purchase_uom);
            if (!uom_exists) {
                frappe.throw(`The Default Purchase UOM (${purchase_uom}) must be in the item's UOMs list.`);
            }
        }
    },

    sales_uom: function(frm) {
        if (frm.doc.sales_uom) {
            console.log(`Sales UOM listener called ...`);
            let sales_uom = frm.doc.sales_uom;
            console.log(`Sales UOM is ${sales_uom}`);

            // Check if the sales_uom exists in the UOMs table
            let uom_exists = frm.doc.uoms.some(row => row.uom === sales_uom);
            if (!uom_exists) {
                frappe.throw(`The Default Sales UOM (${sales_uom}) must be in the item's UOMs list.`);
            }
        }
    },    
    item_code: function(frm){
        console.log(`listening to Item Code`)
        let efris_product_code = frm.doc.item_code; 
        frm.set_value('efris_product_code',frm.doc.item_code);         
        frm.refresh_field("efris_product_code");
    }
         
});

frappe.ui.form.on('UOM Conversion Detail', { 

    uoms_add: function(frm, cdt, cdn) {   
             if (frm.doc.has_multiple_uom) {
            console.log("Row added to UOMs table.");
            update_default_uom_row(frm);
            frm.refresh_field("uoms"); 
        }
    },
    uoms_remove: function(frm, cdt, cdn) {
        if (frm.doc.has_multiple_uom) {
            console.log("Row removed from UOMs table.");
            update_default_uom_row(frm);
            frm.refresh_field("uoms"); 
        }
    },
    uom: function(frm, cdt, cdn){
        if (frm.doc.has_multiple_uom) {
        console.log("UOM changed on table.");
            update_default_uom_row(frm);
            frm.refresh_field("uoms"); 
        }
    }
 });

frappe.ui.form.on("Item", {
    stock_uom: function(frm) {
        handle_stock_uom_change(frm);
    },
    standard_rate: function(frm) {
        handle_standard_rate_change(frm);
    },
    validate: function(frm) {
        frm.refresh_field("uoms");
        if (frm.doc.has_multiple_uom) {
            validate_uoms_table(frm);
        }
    }
});

// Handles changes to `stock_uom`
function handle_stock_uom_change(frm) {
    if (frm.doc.has_multiple_uom) {
        update_default_uom_row(frm);
        frm.refresh_field("uoms"); 
    }
}

// Handles changes to `standard_rate`
function handle_standard_rate_change(frm) {
    if (frm.doc.has_multiple_uom) {
        update_default_uom_row(frm);
        frm.refresh_field("uoms"); 
    }
}

// Updates or resets rows in the `uoms` table based on the default UOM
function update_default_uom_row(frm) {
    const default_uom = frm.doc.stock_uom;
    const default_rate = frm.doc.standard_rate;

    if (!default_uom || default_rate == null) {
        console.log("Stock UOM or Standard Rate is not set. Skipping UOM update.");
        return;
    }

    console.log(`Updating UOM rows: Default UOM = ${default_uom}, Standard Rate = ${default_rate}`);

    if (!frm.doc.uoms) frm.doc.uoms = [];

    // Filter out rows that are outdated (not matching default_uom and with conversion_factor = 1)
    frm.doc.uoms = frm.doc.uoms.filter(row => {
        if (row.uom !== default_uom && row.conversion_factor === 1) {
            console.log(`Removing outdated UOM row: ${row.uom}`);
            return false; // Remove this row
        }
        return true; // Keep this row
    });

    // Check if the default UOM exists in the table
    const existing_row = frm.doc.uoms.find(row => row.uom === default_uom);

    if (existing_row) {
        // Update the existing row
        existing_row.conversion_factor = 1;
        existing_row.is_efris_uom = 1;
        existing_row.efris_unit_price = default_rate;
    } else {
        // Add a new row for the default UOM
        const new_row = frm.add_child("uoms");
        new_row.uom = default_uom;
        new_row.conversion_factor = 1;
        new_row.is_efris_uom = 1;
        new_row.efris_unit_price = default_rate;
    }

    // Refresh the table to reflect the updates
    frm.refresh_field("uoms");
}

// Validates the `uoms` table for multiple UOM scenarios
function validate_uoms_table(frm) {
    const uoms = frm.doc.uoms;

    if (!uoms || uoms.length === 0) {
        frappe.throw("Please configure the UOMs table for this item.");
    }

    // Ensure only one row has conversion_factor = 1
    const default_rows = uoms.filter(row => row.conversion_factor === 1);
    if (default_rows.length > 1) {
        frappe.throw("Only one UOM can have a conversion factor of 1.");
    }

    // Validate required fields for EFRIS-specific UOMs
    uoms.forEach(row => {
        if (row.is_efris_uom) {
            if (!row.efris_unit_price) {
                frappe.throw(`Please set the EFRIS Unit Price for UOM: ${row.uom}`);
            }
            if (!row.custom_package_scale_value) {
                frappe.throw(`Please set the Package Scale Value for UOM: ${row.uom}`);
            }
        }
    });
}
